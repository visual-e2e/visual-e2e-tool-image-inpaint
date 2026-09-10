import { ClearOutlined } from "@ant-design/icons";
import { Button, Space, Typography } from "antd";

interface RemoveActionProps {
  disabled: boolean;
  running: boolean;
  onRemove: () => void;
  onRemoveAll?: () => void;
  showRemoveAll?: boolean;
}

export function RemoveAction({
  disabled,
  running,
  onRemove,
  onRemoveAll,
  showRemoveAll,
}: RemoveActionProps) {
  return (
    <Space direction="vertical" size="small" style={{ width: "100%" }}>
      <Button
        type="primary"
        block
        size="large"
        icon={<ClearOutlined />}
        disabled={disabled || running}
        loading={running}
        onClick={onRemove}
      >
        {running ? "处理中…" : "消除"}
      </Button>
      <Typography.Text type="secondary">
        {disabled ? "涂抹后点击消除" : "点击消除选中区域"}
      </Typography.Text>
      {showRemoveAll && onRemoveAll && (
        <Button block disabled={running} onClick={onRemoveAll}>
          全部消除
        </Button>
      )}
    </Space>
  );
}
