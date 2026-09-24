"use client";

import { useMemo } from "react";
import { parseSegments } from "@/lib/terms";
import { cn } from "@/lib/utils";

interface TermTextProps {
  text: string;
  className?: string;
  chipClassName?: string;
}

/** Renders card text with {términos} shown as chips/tags. */
export function TermText({ text, className, chipClassName }: TermTextProps) {
  const segments = useMemo(() => parseSegments(text ?? ""), [text]);

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.type === "term" ? (
          <span
            key={i}
            className={cn(
              "mx-0.5 my-0.5 inline-flex items-center rounded-full bg-primary/15 px-2.5 py-0.5 align-baseline text-[0.9em] font-semibold text-primary",
              chipClassName
            )}
          >
            {seg.value}
          </span>
        ) : (
          <span key={i}>{seg.value}</span>
        )
      )}
    </span>
  );
}
