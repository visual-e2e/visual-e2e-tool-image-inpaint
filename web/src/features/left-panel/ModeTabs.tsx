import { ProcessMode } from "../../shared/enums/process-mode.enum";
import { Segmented } from "antd";

interface ModeTabsProps {
  mode: ProcessMode;
  onChange: (mode: ProcessMode) => void;
}

export function ModeTabs({ mode, onChange }: ModeTabsProps) {
  return (
    <Segmented
      block
      value={mode}
      onChange={(value) => onChange(value as ProcessMode)}
      options={[
        { label: "自动消除", value: ProcessMode.Auto },
        { label: "手动消除", value: ProcessMode.ManualBrush },
      ]}
    />
  );
}
