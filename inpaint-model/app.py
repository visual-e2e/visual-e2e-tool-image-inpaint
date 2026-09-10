"""
LaMa inpaint HTTP adapter for visual-e2e-tool-image-inpaint.

Contract (HttpAiInpaintProvider):
  POST /inpaint
  { mode, imageBase64, maskBase64?, exportQuality }
  → { resultBase64, width, height } | { error }
"""

from __future__ import annotations

import base64
import io
import os
from functools import lru_cache
from typing import Optional

import torch
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from PIL import Image
from pydantic import BaseModel, Field
from simple_lama_inpainting.utils import download_model, prepare_img_and_mask

app = FastAPI(title="LaMa Inpaint", version="1.0.0")

API_KEY = os.getenv("INPAINT_API_KEY", "").strip()
LAMA_MODEL_URL = os.environ.get(
    "LAMA_MODEL_URL",
    "https://github.com/enesmsahin/simple-lama-inpainting/releases/download/v0.1.0/big-lama.pt",
)


class InpaintRequest(BaseModel):
    mode: str = Field(description="auto | manual_brush")
    imageBase64: str
    maskBase64: Optional[str] = None
    exportQuality: Optional[str] = "original"


class InpaintResponse(BaseModel):
    resultBase64: str
    width: int
    height: int


class LamaEngine:
    """Load TorchScript LaMa with map_location so Mac/CPU hosts don't require CUDA."""

    def __init__(self, device: torch.device) -> None:
        model_path = os.environ.get("LAMA_MODEL")
        if model_path:
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"lama torchscript model not found: {model_path}")
        else:
            model_path = download_model(LAMA_MODEL_URL)

        # Critical: weights were saved on CUDA; force local device at load time
        self.model = torch.jit.load(model_path, map_location=device)
        self.model.eval()
        self.model.to(device)
        self.device = device

    def __call__(self, image: Image.Image, mask: Image.Image) -> Image.Image:
        import numpy as np

        image_t, mask_t = prepare_img_and_mask(image, mask, self.device)
        with torch.inference_mode():
            inpainted = self.model(image_t, mask_t)
            cur = inpainted[0].permute(1, 2, 0).detach().cpu().numpy()
            cur = np.clip(cur * 255, 0, 255).astype(np.uint8)
            return Image.fromarray(cur)


def _device_works(name: str) -> bool:
    try:
        torch.empty(1, device=name)
        return True
    except Exception:
        return False


def _pick_device() -> str:
    forced = os.getenv("INPAINT_DEVICE", "").strip().lower()
    if forced:
        if _device_works(forced):
            return forced
        raise RuntimeError(
            f"INPAINT_DEVICE={forced} is not usable on this machine; "
            "try cpu or mps"
        )

    # LaMa TorchScript uses FFT (FourierUnit). Apple MPS often fails those ops,
    # so only use CUDA when verified; otherwise CPU. Opt into mps via INPAINT_DEVICE=mps.
    if torch.cuda.is_available() and _device_works("cuda"):
        return "cuda"
    return "cpu"


@lru_cache(maxsize=1)
def get_lama() -> LamaEngine:
    device_name = _pick_device()
    print(f"[inpaint-model] loading LaMa on device={device_name}")
    return LamaEngine(device=torch.device(device_name))


def _strip_data_url(raw: str) -> str:
    if "," in raw and raw.strip().startswith("data:"):
        return raw.split(",", 1)[1]
    return raw


def _decode_image(raw: str) -> Image.Image:
    data = base64.b64decode(_strip_data_url(raw))
    return Image.open(io.BytesIO(data)).convert("RGB")


def _decode_mask(raw: str, size: tuple[int, int]) -> Image.Image:
    """White / bright pixels = regions to inpaint."""
    data = base64.b64decode(_strip_data_url(raw))
    mask = Image.open(io.BytesIO(data)).convert("L")
    if mask.size != size:
        mask = mask.resize(size, Image.Resampling.NEAREST)
    # Binarize: luminance >= 32 → white (inpaint), else black (keep)
    return mask.point(lambda p: 255 if p >= 32 else 0)


def _encode_png(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _check_auth(authorization: Optional[str]) -> None:
    if not API_KEY:
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    if token != API_KEY:
        raise HTTPException(status_code=401, detail="invalid api key")


@app.get("/health")
def health():
    return {
        "ok": True,
        "provider": "lama",
        "device": _pick_device(),
        "modelLoaded": get_lama.cache_info().currsize > 0,
    }


@app.post("/inpaint")
def inpaint(
    body: InpaintRequest,
    authorization: Optional[str] = Header(default=None),
):
    _check_auth(authorization)

    try:
        image = _decode_image(body.imageBase64)
    except Exception as err:
        raise HTTPException(status_code=400, detail=f"invalid imageBase64: {err}") from err

    width, height = image.size

    # LaMa requires a mask. Without one (typical auto-without-detector), echo original.
    if not body.maskBase64:
        return InpaintResponse(
            resultBase64=_encode_png(image),
            width=width,
            height=height,
        )

    try:
        mask = _decode_mask(body.maskBase64, (width, height))
    except Exception as err:
        raise HTTPException(status_code=400, detail=f"invalid maskBase64: {err}") from err

    try:
        lama = get_lama()
        result = lama(image, mask)
        if not isinstance(result, Image.Image):
            result = Image.fromarray(result)
        result = result.convert("RGB")
        # LaMa pads to modulo; crop back to original size (prefer crop over stretch)
        if result.size != (width, height):
            result = result.crop((0, 0, width, height))
    except Exception as err:
        raise HTTPException(status_code=502, detail=f"lama failed: {err}") from err

    return InpaintResponse(
        resultBase64=_encode_png(result),
        width=width,
        height=height,
    )


@app.exception_handler(HTTPException)
async def http_error_handler(_request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail if isinstance(exc.detail, str) else str(exc.detail)},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": str(exc.errors())})


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("INPAINT_HOST", "127.0.0.1")
    port = int(os.getenv("INPAINT_PORT", "9000"))
    # Warm model on boot (optional; first request still downloads weights)
    if os.getenv("INPAINT_PRELOAD", "1") == "1":
        get_lama()
    uvicorn.run(app, host=host, port=port)
