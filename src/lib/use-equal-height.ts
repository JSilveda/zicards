import { useLayoutEffect, useRef, useState, useCallback } from "react";

/**
 * Measures a set of tiles and returns the tallest natural height so all
 * tiles can share it (equal-height cards). Re-measures when `depsKey`
 * changes (e.g. new block of cards). Two passes, both before paint:
 * 1) reset to natural height, 2) measure max and apply as min-height.
 */
export function useEqualTileHeight<T extends HTMLElement>(depsKey: string) {
  const refs = useRef(new Map<string, T>());
  const [height, setHeight] = useState<number | null>(null);

  const setRef = useCallback(
    (id: string) => (el: T | null) => {
      if (el) {
        refs.current.set(id, el);
      } else {
        refs.current.delete(id);
      }
    },
    []
  );

  useLayoutEffect(() => {
    setHeight(null);
  }, [depsKey]);

  useLayoutEffect(() => {
    if (height !== null) return;
    let max = 0;
    refs.current.forEach((el) => {
      if (el.isConnected) {
        max = Math.max(max, el.offsetHeight);
      }
    });
    if (max > 0) setHeight(max);
  }, [depsKey, height]);

  return { setRef, height };
}
