import { useEffect, useRef, useState } from "react";

export function useObjectUrl(source: Blob | MediaSource | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (prev.current) {
      URL.revokeObjectURL(prev.current);
      prev.current = null;
    }
    if (!source) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(source);
    prev.current = next;
    setUrl(next);
    return () => {
      if (prev.current) {
        URL.revokeObjectURL(prev.current);
        prev.current = null;
      }
    };
  }, [source]);

  return url;
}

export function revokeObjectUrl(url?: string | null): void {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
