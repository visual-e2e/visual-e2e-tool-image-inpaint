# AI 去水印（Image Inpaint）

Visual E2E 工具：`image-inpaint`。

支持单图 / 批量 / ZIP 压缩包去水印，手动画笔与矩形选区可复用到全部图片，并通过 Host RPC 持久化缓存。

界面布局对齐 PhotoGrid 编辑器（Ant Design）：左侧工具栏、中间画布、右侧可滚动图库。

## 功能

- 上传图片（点击）、文件夹 / ZIP（顶栏「上传」或拖放）
- 手动画笔 / 自动模式（自动当前为 mock 弱处理，可接真实模型）
- 选区复用：基准图选区按归一化坐标映射到全部图片
- 前后对比与原分辨率下载
- 会话缓存：写入 `fs.getDataDir().tools/image-inpaint`；缓存被清理时会提示

## 开发

```bash
npm install

export E2E_ROOT="/path/to/visual-e2e-test"
export E2E_RUNTIME=client

npm run dev
```

可选真实模型（LaMa，见 `inpaint-model/`）：

```bash
# 终端 1：启动本地 LaMa 服务
cd inpaint-model && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && python app.py

# 终端 2：接入本工具
export INPAINT_API_URL="http://127.0.0.1:9000/inpaint"
# export INPAINT_API_KEY="..."   # 仅当模型服务启用了鉴权

npm run dev
```

或指向任意兼容端点：`INPAINT_API_URL` + 可选 `INPAINT_API_KEY`。  
未配置时使用本地 `MockInpaintProvider`。
## RPC

- `fs.getDataDir`：解析缓存根目录（`tools/image-inpaint`）
- `cache.clear` 通知：提示缓存可能已失效

## 打包

```bash
npm run build
npm run pack
```