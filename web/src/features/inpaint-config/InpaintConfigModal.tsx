import { Alert, Button, Form, Input, Modal, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import {
  clearInpaintConfig,
  saveInpaintConfig,
  testInpaintConfig,
  type InpaintConfigResponse,
} from "../../shared/api/inpaint-config.api";

const DEFAULT_URL = "http://127.0.0.1:9000/inpaint";

interface InpaintConfigModalProps {
  open: boolean;
  config: InpaintConfigResponse | null;
  onClose: () => void;
  onSaved: (next: InpaintConfigResponse) => void;
}

export function InpaintConfigModal(props: InpaintConfigModalProps) {
  const { open, config, onClose, onSaved } = props;
  const [form] = Form.useForm<{ apiUrl: string; apiKey?: string }>();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [testMessage, setTestMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setTestMessage(null);
    form.setFieldsValue({
      apiUrl: config?.apiUrl || DEFAULT_URL,
      apiKey: "",
    });
  }, [open, config, form]);

  async function handleTest() {
    const values = await form.validateFields(["apiUrl"]);
    setTesting(true);
    setTestMessage(null);
    try {
      const result = await testInpaintConfig({
        apiUrl: values.apiUrl,
        apiKey: form.getFieldValue("apiKey") || undefined,
      });
      setTestMessage({
        type: result.ok ? "success" : "error",
        text: result.message || result.error || (result.ok ? "连接成功" : "连接失败"),
      });
    } catch (err) {
      setTestMessage({
        type: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    const values = await form.validateFields();
    setSaving(true);
    setTestMessage(null);
    try {
      const payload: { apiUrl: string; apiKey?: string } = {
        apiUrl: values.apiUrl,
      };
      // Only send apiKey when user typed one; empty keeps the cached key on server.
      if (values.apiKey?.trim()) {
        payload.apiKey = values.apiKey.trim();
      }
      const next = await saveInpaintConfig(payload);
      onSaved(next);
      onClose();
    } catch (err) {
      setTestMessage({
        type: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setClearing(true);
    setTestMessage(null);
    try {
      const next = await clearInpaintConfig();
      onSaved(next);
      form.setFieldsValue({ apiUrl: DEFAULT_URL, apiKey: "" });
      onClose();
    } catch (err) {
      setTestMessage({
        type: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setClearing(false);
    }
  }

  return (
    <Modal
      title="配置 AI 模型"
      open={open}
      onCancel={onClose}
      destroyOnHidden
      width={520}
      footer={
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Button danger loading={clearing} onClick={() => void handleClear()}>
            清除配置
          </Button>
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button loading={testing} onClick={() => void handleTest()}>
              测试连接
            </Button>
            <Button type="primary" loading={saving} onClick={() => void handleSave()}>
              保存
            </Button>
          </Space>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 12 }}>
        本工具使用 LaMa 图像修复模型做去水印。可自行部署同协议服务，或用{" "}
        <code>@visual-e2e/ai</code> 启动官方模块 <code>image-inpaint</code>。
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
        使用 vetai（本机需 Docker）：
      </Typography.Paragraph>
      <Typography.Paragraph
        type="secondary"
        style={{ marginBottom: 12, whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 12 }}
      >
        {`npm i -g @visual-e2e/ai
vetai select
vetai test image-inpaint`}
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        默认地址 <code>{DEFAULT_URL}</code>。先启动 Docker 与模型服务再「测试连接」，保存后立即生效。
      </Typography.Paragraph>
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="apiUrl"
          label="服务地址"
          rules={[
            { required: true, message: "请填写服务地址" },
            { type: "url", message: "请输入合法 URL" },
          ]}
        >
          <Input placeholder={DEFAULT_URL} allowClear />
        </Form.Item>
        <Form.Item name="apiKey" label="API Key（可选）">
          <Input.Password
            placeholder={config?.hasApiKey ? "已保存密钥，留空则保留原值" : "未设置鉴权可留空"}
            allowClear
          />
        </Form.Item>
      </Form>
      {testMessage && (
        <Alert
          type={testMessage.type}
          showIcon
          message={testMessage.text}
          style={{ marginTop: 8 }}
        />
      )}
    </Modal>
  );
}
