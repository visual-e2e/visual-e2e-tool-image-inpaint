# LaMa Inpaint 模型服务

为本工具 `HttpAiInpaintProvider` 提供本地 LaMa 推理（`simple-lama-inpainting`）。

## 协议

```
POST /inpaint
Authorization: Bearer <INPAINT_API_KEY>   # 可选，仅当服务端设置了 key

{
  "mode": "manual_brush" | "auto",
  "imageBase64": "...",
  "maskBase64": "...",          # 白色/亮区 = 待修复；无 mask 时原样返回
  "exportQuality": "original"
}

→ { "resultBase64": "...", "width": 1920, "height": 1080 }
```

健康检查：`GET /health`

## 本地启动

```bash
cd inpaint-model
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 首次运行会下载 LaMa 权重
python app.py
# 默认 http://127.0.0.1:9000/inpaint
```

可选环境变量：

| 变量 | 说明 | 默认 |
|------|------|------|
| `INPAINT_HOST` | 监听地址 | `127.0.0.1` |
| `INPAINT_PORT` | 端口 | `9000` |
| `INPAINT_DEVICE` | `cuda` / `cpu`（推荐）/ `mps`（LaMa FFT 常失败，需显式指定） | `cuda` 可用则用，否则 `cpu` |
| `INPAINT_API_KEY` | Bearer 鉴权 | 空（不鉴权） |
| `INPAINT_PRELOAD` | 启动时加载模型 | `1` |

## 接入本工具

```bash
export INPAINT_API_URL="http://127.0.0.1:9000/inpaint"
# 若模型服务设置了 INPAINT_API_KEY，这里填同样的值：
# export INPAINT_API_KEY="..."

npm run dev
```

## Docker

```bash
docker build -t inpaint-lama .
docker run --rm -p 9000:9000 inpaint-lama
```

GPU：自行改用带 CUDA 的基础镜像，并设置 `INPAINT_DEVICE=cuda`。

## 说明

- **手动 / 有 mask**：LaMa 修复选区。
- **自动且无 mask**：LaMa 不能检测水印，接口会原样返回图片（需另接检测或继续手动画笔）。
- 权重为 CUDA 导出的 TorchScript；本服务用 `map_location` 加载到本机 `cpu`/`cuda`，Mac 无需 NVIDIA。
- **不要默认用 `mps`**：LaMa 的 FFT（`FourierUnit`）在 Apple MPS 上常直接报错；Mac 请用 `cpu`。
- 依赖需 `numpy<2` 与 `opencv-python<4.12`，避免与当前 torch 冲突。
