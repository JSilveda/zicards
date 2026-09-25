"use client";

import { useEffect, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import type { Block } from "@blocknote/core";

interface NotesEditorProps {
  pageId: string;
  initialContent: unknown;
  onChange: (content: unknown) => void;
}

export function NotesEditor({ pageId, initialContent, onChange }: NotesEditorProps) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const update = () => setDark(document.documentElement.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const editor = useCreateBlockNote({
    initialContent: (Array.isArray(initialContent) && initialContent.length > 0
      ? initialContent
      : undefined) as Block[] | undefined,
  });

  return (
    <BlockNoteView
      key={pageId}
      editor={editor}
      theme={dark ? "dark" : "light"}
      onChange={() => onChange(editor.document)}
      className="min-h-[50vh]"
    />
  );
}
