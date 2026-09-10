import { MaskApplyMode } from "../../shared/enums/mask-apply-mode.enum";

interface MaskReuseToolbarProps {
  enabled: boolean;
  maskApplyMode: MaskApplyMode;
  onMaskApplyModeChange: (mode: MaskApplyMode) => void;
  onApplyToAll: () => void;
  canApply: boolean;
}

export function MaskReuseToolbar(props: MaskReuseToolbarProps) {
  const {
    enabled,
    maskApplyMode,
    onMaskApplyModeChange,
    onApplyToAll,
    canApply,
  } = props;

  if (!enabled) return null;

  return (
    <div className="toolbar__group">
      <label>
        <input
          type="checkbox"
          checked={maskApplyMode === MaskApplyMode.ReuseSelection}
          onChange={(e) =>
            onMaskApplyModeChange(
              e.target.checked
                ? MaskApplyMode.ReuseSelection
                : MaskApplyMode.PerImage,
            )
          }
        />
        选区复用到全部
      </label>
      <button type="button" onClick={onApplyToAll} disabled={!canApply}>
        应用到全部
      </button>
    </div>
  );
}
