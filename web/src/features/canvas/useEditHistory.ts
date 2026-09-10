import { useCallback, useRef, useState } from "react";
import type { ReusableMask } from "../../shared/types/mask.types";

export function useEditHistory() {
  const past = useRef<Array<ReusableMask | null>>([]);
  const future = useRef<Array<ReusableMask | null>>([]);
  const [, bump] = useState(0);

  const push = useCallback((mask: ReusableMask | null) => {
    past.current.push(mask ? structuredClone(mask) : null);
    if (past.current.length > 40) past.current.shift();
    future.current = [];
    bump((n) => n + 1);
  }, []);

  const undo = useCallback((): ReusableMask | null | undefined => {
    if (!past.current.length) return undefined;
    const current = past.current.pop() ?? null;
    future.current.push(current);
    bump((n) => n + 1);
    return past.current.length
      ? structuredClone(past.current[past.current.length - 1])
      : null;
  }, []);

  const redo = useCallback((): ReusableMask | null | undefined => {
    if (!future.current.length) return undefined;
    const next = future.current.pop() ?? null;
    past.current.push(next);
    bump((n) => n + 1);
    return next ? structuredClone(next) : null;
  }, []);

  const clear = useCallback(() => {
    past.current = [];
    future.current = [];
    bump((n) => n + 1);
  }, []);

  return {
    push,
    undo,
    redo,
    clear,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
