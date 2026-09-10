import { useEffect, useState } from "react";
import { Alert, Button } from "antd";
import { SelectionTool } from "../../shared/enums/selection-tool.enum";

const STORAGE_KEY = "image-inpaint-howto-dismissed";

interface HowToCardProps {
  selectionTool: SelectionTool;
}

function tipFor(tool: SelectionTool): string {
  switch (tool) {
    case SelectionTool.Rectangle:
      return "框选你想消除的物体。";
    case SelectionTool.AutoDetect:
      return "点击消除后，AI 将自动识别水印区域。";
    default:
      return "涂抹你想消除的区域，可调节笔刷大小。";
  }
}

export function HowToCard({ selectionTool }: HowToCardProps) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setOpen(false);
    } catch {
      // ignore
    }
  }, []);

  if (!open) return null;

  return (
    <Alert
      type="info"
      showIcon
      message="如何使用"
      description={
        <>
          <p style={{ margin: "0 0 8px" }}>{tipFor(selectionTool)}</p>
          <Button
            size="small"
            type="link"
            onClick={() => {
              setOpen(false);
              try {
                localStorage.setItem(STORAGE_KEY, "1");
              } catch {
                // ignore
              }
            }}
          >
            知道啦
          </Button>
        </>
      }
    />
  );
}
