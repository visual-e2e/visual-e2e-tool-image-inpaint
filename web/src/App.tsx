import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { App as AntdApp } from "antd";
import { WatermarkRemoverPage } from "./pages/WatermarkRemoverPage";

const theme = {
  token: {
    colorPrimary: "#14b8a6",
    colorInfo: "#14b8a6",
    borderRadius: 10,
    fontFamily:
      '"Segoe UI", "PingFang SC", "Hiragino Sans GB", system-ui, sans-serif',
  },
};

export function App() {
  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      <AntdApp>
        <WatermarkRemoverPage />
      </AntdApp>
    </ConfigProvider>
  );
}
