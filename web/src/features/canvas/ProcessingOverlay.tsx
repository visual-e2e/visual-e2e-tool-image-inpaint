import { useEffect, useState } from "react";

interface ProcessingOverlayProps {
  visible: boolean;
  label?: string;
}

export function ProcessingOverlay({ visible, label = "AI正在处理" }: ProcessingOverlayProps) {
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    if (!visible) {
      setProgress(8);
      return;
    }
    setProgress(12);
    const timer = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 92) return p;
        const step = Math.max(1, Math.round((95 - p) / 12));
        return Math.min(92, p + step);
      });
    }, 280);
    return () => window.clearInterval(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="processing-overlay">
      <div className="processing-overlay__dots" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>
      <p>
        {label} {progress}%…
      </p>
    </div>
  );
}
