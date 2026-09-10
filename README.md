# AI 去水印（Image Inpaint）

Visual E2E 工具：`image-inpaint`。

支持单图 / 批量 / ZIP 去水印，选区可复用，Host RPC 缓存。

## 功能

- 上传图片、文件夹、ZIP
- 手动画笔 / 自动模式（未配置 AI 模型时为本地占位处理）
- 选区复用到全部图片
- 前后对比与原分辨率下载
- 会话缓存：自动保存；进入工具时自动加载

## 开发

```bash
npm install

export E2E_ROOT="/path/to/visual-e2e-test"
export E2E_RUNTIME=client

npm run dev
```

## AI 模型

本工具使用 LaMa 图像修复模型做去水印。可自行部署同协议服务，或用 `@visual-e2e/ai` 启动 `image-inpaint`。

```bash
npm i -g @visual-e2e/ai
vetai select
vetai test image-inpaint
```

工具内「AI 模型」填写：`http://127.0.0.1:9000/inpaint`  
也可用环境变量 `INPAINT_API_URL` / `INPAINT_API_KEY`（写入 `data/settings.json`）。

先启动 Docker 与模型服务再测连通。

## RPC

- `fs.getDataDir`：缓存根目录
- `cache.clear`：缓存清理通知

## 打包

```bash
npm run build
npm run pack
```
