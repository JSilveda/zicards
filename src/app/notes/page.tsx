"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  getNotePages,
  createNotePage,
  updateNotePage,
  moveNotePage,
  placeNotePage,
  deleteNotePage,
  getNoteDescendantIds,
} from "@/lib/queries/note-pages";
import {
  Plus,
  ChevronRight,
  ChevronDown,
  FileText,
  Trash2,
  PanelLeft,
  Check,
  AlertCircle,
} from "lucide-react";
import type { NotePage } from "@/types";

const AuthGuard = dynamic(() => import("@/components/auth-guard").then(m => m.AuthGuard), { ssr: false });
const NotesEditor = dynamic(
  () => import("@/components/notes-editor").then((m) => m.NotesEditor),
  {
    ssr: false,
    loading: () => <p className="text-sm text-muted-foreground py-8">Loading editor...</p>,
  }
);

const ICON_PRESETS = [
  "📝", "📚", "💡", "🎯", "🌍", "🗣️", "📖", "✏️",
  "🔥", "⭐", "💬", "🧠", "📌", "✅", "🗓️", "🎓",
  "💭", "🚀", "📎", "🔖",
];

interface DragItem {
  id: string;
}

function sortSiblings<T extends { position: number | null; created_at: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.created_at.localeCompare(b.created_at)
  );
}

export default function NotesPage() {
  const [pages, setPages] = useState<NotePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [unsupported, setUnsupported] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<NotePage | null>(null);

  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: "before" | "inside" | "after";
  } | null>(null);

  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPages = useCallback(async (selectId?: string | null) => {
    try {
      const data = await getNotePages();
      setPages(data);
      if (selectId !== undefined) {
        setSelectedId(selectId);
      } else {
        setSelectedId((prev) => {
          if (prev && data.some((p) => p.id === prev)) return prev;
          const roots = sortSiblings(data.filter((p) => !p.parent_id));
          return roots.length > 0 ? roots[0].id : null;
        });
      }
    } catch (error) {
      console.error("Failed to load note pages:", error);
      setUnsupported(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const selected = pages.find((p) => p.id === selectedId) || null;

  // Sync title editor when selection changes
  useEffect(() => {
    setTitle(selected?.title ?? "");
    setLastSavedAt(selected?.updated_at ?? null);
    setSaveStatus("saved");
    setIconPickerOpen(false);
  }, [selectedId, selected?.title, selected?.updated_at]);

  const ancestorChain = useCallback(
    (id: string | null): string[] => {
      const chain: string[] = [];
      const byId = new Map(pages.map((p) => [p.id, p]));
      const guard = new Set<string>();
      let cur = id ? byId.get(id) : undefined;
      while (cur?.parent_id && !guard.has(cur.id)) {
        guard.add(cur.id);
        chain.unshift(cur.parent_id);
        cur = byId.get(cur.parent_id);
      }
      return chain;
    },
    [pages]
  );

  const selectPage = (id: string) => {
    setSelectedId(id);
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const a of ancestorChain(id)) next.add(a);
      return next;
    });
    setSidebarOpen(false);
  };

  const persistTitle = (id: string, value: string) => {
    setSaveStatus("saving");
    updateNotePage(id, { title: value.trim() || "Untitled" })
      .then(() => {
        setSaveStatus("saved");
        setLastSavedAt(new Date().toISOString());
        setPages((prev) => prev.map((p) => (p.id === id ? { ...p, title: value } : p)));
      })
      .catch(() => setSaveStatus("error"));
  };

  const handleTitleChange = (value: string) => {
    if (!selected) return;
    setTitle(value);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => persistTitle(selected.id, value), 600);
  };

  const handleContentChange = (content: unknown) => {
    if (!selected) return;
    setSaveStatus("saving");
    if (contentTimer.current) clearTimeout(contentTimer.current);
    contentTimer.current = setTimeout(() => {
      updateNotePage(selected.id, { content: content as NotePage["content"] })
        .then(() => {
          setSaveStatus("saved");
          setLastSavedAt(new Date().toISOString());
        })
        .catch(() => setSaveStatus("error"));
    }, 800);
  };

  const handleNewPage = async (parentId: string | null) => {
    try {
      const created = await createNotePage("Untitled", parentId);
      await loadPages(created.id);
      if (parentId) {
        setExpanded((prev) => new Set(prev).add(parentId));
      }
    } catch (error) {
      console.error("Failed to create page:", error);
    }
  };

  const handleIconSelect = async (icon: string | null) => {
    if (!selected) return;
    setIconPickerOpen(false);
    try {
      await updateNotePage(selected.id, { icon });
      setPages((prev) => prev.map((p) => (p.id === selected.id ? { ...p, icon } : p)));
    } catch (error) {
      console.error("Failed to set icon:", error);
    }
  };

  const confirmDeletePage = async () => {
    if (!pendingDelete) return;
    try {
      const parentId = pendingDelete.parent_id;
      await deleteNotePage(pages, pendingDelete.id);
      if (selectedId === pendingDelete.id) {
        const siblings = sortSiblings(pages.filter((p) => (p.parent_id ?? null) === (parentId ?? null) && p.id !== pendingDelete.id));
        setSelectedId(parentId ?? siblings[0]?.id ?? null);
      }
      await loadPages(selectedId === pendingDelete.id ? undefined : selectedId);
    } catch (error) {
      console.error("Failed to delete page:", error);
    } finally {
      setPendingDelete(null);
    }
  };

  const clearDrag = () => {
    setDragItem(null);
    setDropTarget(null);
  };

  const applyPageOrder = async (parentId: string | null, orderedIds: string[]) => {
    await Promise.all(orderedIds.map((id, i) => placeNotePage(id, parentId, i)));
  };

  const handleRowDrop = async (
    e: React.DragEvent,
    target: NotePage,
    position: "before" | "inside" | "after"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragItem) {
      clearDrag();
      return;
    }
    try {
      if (position === "inside") {
        if (dragItem.id === target.id || getNoteDescendantIds(pages, dragItem.id).has(target.id)) {
          clearDrag();
          return;
        }
        await moveNotePage(pages, dragItem.id, target.id);
        setExpanded((prev) => new Set(prev).add(target.id));
      } else {
        if (dragItem.id === target.id || getNoteDescendantIds(pages, dragItem.id).has(target.id)) {
          clearDrag();
          return;
        }
        const newParentId = target.parent_id;
        const siblings = sortSiblings(
          pages.filter((p) => (p.parent_id ?? null) === (newParentId ?? null) && p.id !== dragItem.id)
        );
        let idx = siblings.findIndex((p) => p.id === target.id);
        if (idx === -1) {
          clearDrag();
          return;
        }
        if (position === "after") idx += 1;
        const dragged = pages.find((p) => p.id === dragItem.id);
        if (!dragged) {
          clearDrag();
          return;
        }
        const newOrder = [...siblings];
        newOrder.splice(idx, 0, dragged);
        await applyPageOrder(newParentId, newOrder.map((p) => p.id));
      }
      await loadPages();
    } catch (error) {
      console.error("Failed to move page:", error);
    }
    clearDrag();
  };

  const handleSidebarDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragItem) {
      clearDrag();
      return;
    }
    try {
      const page = pages.find((p) => p.id === dragItem.id);
      if (page && page.parent_id !== null) {
        await moveNotePage(pages, dragItem.id, null);
        await loadPages();
      }
    } catch (error) {
      console.error("Failed to move page:", error);
    }
    clearDrag();
  };

  const renderTree = (parentId: string | null, depth: number): React.ReactNode[] => {
    const children = sortSiblings(pages.filter((p) => (p.parent_id ?? null) === parentId));
    return children.flatMap((page) => {
      const kids = pages.filter((p) => p.parent_id === page.id);
      const isOpen = expanded.has(page.id);
      const isSelected = page.id === selectedId;
      const isDropTarget = dropTarget?.id === page.id;
      const pos = isDropTarget ? dropTarget.position : null;
      const nodes: React.ReactNode[] = [
        <div
          key={page.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", page.id);
            e.dataTransfer.effectAllowed = "move";
            setDragItem({ id: page.id });
          }}
          onDragOver={(e) => {
            if (dragItem && dragItem.id !== page.id) {
              e.preventDefault();
              e.stopPropagation();
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const ratio = (e.clientY - rect.top) / rect.height;
              setDropTarget({
                id: page.id,
                position: ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside",
              });
            }
          }}
          onDragLeave={() => setDropTarget(null)}
          onDrop={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const ratio = (e.clientY - rect.top) / rect.height;
            handleRowDrop(e, page, ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside");
          }}
          onDragEnd={clearDrag}
          onClick={() => selectPage(page.id)}
          className={`group flex cursor-pointer items-center gap-1 rounded-lg py-1.5 pr-2 transition-colors ${
            isSelected ? "bg-secondary" : "hover:bg-muted"
          } ${
            isDropTarget && pos !== "inside"
              ? pos === "before"
                ? "outline outline-2 outline-primary outline-offset-1 -translate-y-0.5"
                : "outline outline-2 outline-primary outline-offset-1 translate-y-0.5"
              : ""
          } ${isDropTarget && pos === "inside" ? "bg-primary/10 outline outline-2 outline-primary" : ""}`}
          style={{ paddingLeft: `${8 + depth * 18}px` }}
        >
          {kids.length > 0 ? (
            <button
              className="shrink-0 rounded p-0.5 hover:bg-muted-foreground/10"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(page.id)) next.delete(page.id);
                  else next.add(page.id);
                  return next;
                });
              }}
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}
          <span className="shrink-0 text-base leading-none">{page.icon ?? <FileText className="h-4 w-4 text-muted-foreground" />}</span>
          <span className="min-w-0 flex-1 truncate text-sm">{page.title || "Untitled"}</span>
          <button
            className="shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-muted-foreground/10 group-hover:opacity-100"
            title="New subpage"
            onClick={(e) => {
              e.stopPropagation();
              handleNewPage(page.id);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            className="shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-muted-foreground/10 hover:text-destructive group-hover:opacity-100"
            title="Delete page"
            onClick={(e) => {
              e.stopPropagation();
              setPendingDelete(page);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>,
      ];
      if (isOpen) nodes.push(...renderTree(page.id, depth + 1));
      return nodes;
    });
  };

  return (
    <AuthGuard>
      <Navbar />
      {loading ? (
        <main className="container mx-auto px-4 py-8">
          <div className="h-10 w-48 rounded-xl bg-muted animate-pulse mb-4" />
          <div className="h-64 rounded-xl bg-muted animate-pulse" />
        </main>
      ) : unsupported ? (
        <main className="container mx-auto px-4 py-8 max-w-2xl text-center">
          <h1 className="text-2xl font-bold mb-2">Notes unavailable</h1>
          <p className="text-muted-foreground">
            The notes table is missing. Please run{" "}
            <code className="bg-muted px-1 rounded">supabase/migrations/004_note_pages.sql</code>{" "}
            in the Supabase SQL editor.
          </p>
        </main>
      ) : (
        <div className="flex h-[calc(100dvh-65px)]">
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <aside
            className={`fixed md:static z-40 flex h-[calc(100dvh-65px)] w-72 shrink-0 flex-col border-r bg-background transition-transform md:translate-x-0 ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
            onDragOver={(e) => {
              if (dragItem) e.preventDefault();
            }}
            onDrop={handleSidebarDrop}
          >
            <div className="flex items-center justify-between p-3">
              <span className="text-sm font-semibold text-muted-foreground">Notes</span>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleNewPage(null)} title="New page">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {pages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-3">No notes yet</p>
                  <Button size="sm" className="gap-1" onClick={() => handleNewPage(null)}>
                    <Plus className="h-4 w-4" />
                    New page
                  </Button>
                </div>
              ) : (
                renderTree(null, 0)
              )}
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
            {!selected ? (
              <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-bold mb-2">Select a note</h2>
                <p className="text-muted-foreground mb-4">Choose a page from the sidebar or create a new one.</p>
                <Button className="gap-1" onClick={() => handleNewPage(null)}>
                  <Plus className="h-4 w-4" />
                  New page
                </Button>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-3xl px-4 sm:px-8 py-6">
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 md:hidden"
                    onClick={() => setSidebarOpen(true)}
                    title="Open notes sidebar"
                  >
                    <PanelLeft className="h-4 w-4" />
                  </Button>
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    {saveStatus === "saving" ? (
                      "Saving…"
                    ) : saveStatus === "error" ? (
                      <span className="flex items-center gap-1 text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" /> Save failed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Saved
                        {lastSavedAt && ` · ${new Date(lastSavedAt).toLocaleString()}`}
                      </span>
                    )}
                  </span>
                </div>

                <div className="relative mb-1">
                  <button
                    className="text-5xl leading-none hover:bg-muted rounded-lg px-1 transition-colors"
                    onClick={() => setIconPickerOpen(!iconPickerOpen)}
                    title="Pick an icon"
                  >
                    {selected.icon ?? "📄"}
                  </button>
                  {iconPickerOpen && (
                    <div className="absolute z-20 mt-1 w-64 rounded-xl border bg-card p-2 shadow-lg">
                      <div className="grid grid-cols-10 gap-1">
                        {ICON_PRESETS.map((emoji) => (
                          <button
                            key={emoji}
                            className="rounded-lg p-1 text-xl hover:bg-muted"
                            onClick={() => handleIconSelect(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      {selected.icon && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 w-full"
                          onClick={() => handleIconSelect(null)}
                        >
                          Remove icon
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onPaste={(e) => {
                    // Mobile browsers truncate multi-line pastes in single-line
                    // inputs to the first line; desktop joins them. Normalize so
                    // nothing is silently lost on either platform.
                    const text = e.clipboardData.getData("text");
                    if (text && /[\r\n]/.test(text)) {
                      e.preventDefault();
                      const flat = text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
                      const el = e.currentTarget;
                      const start = el.selectionStart ?? title.length;
                      const end = el.selectionEnd ?? title.length;
                      const next = title.slice(0, start) + flat + title.slice(end);
                      handleTitleChange(next);
                      requestAnimationFrame(() => {
                        try {
                          el.setSelectionRange(start + flat.length, start + flat.length);
                        } catch {}
                      });
                    }
                  }}
                  placeholder="Untitled"
                  className="border-0 px-1 text-3xl font-bold shadow-none focus-visible:ring-0 h-auto py-1"
                />

                <div className="mt-2">
                  <NotesEditor
                    key={selected.id}
                    pageId={selected.id}
                    initialContent={selected.content}
                    onChange={handleContentChange}
                  />
                </div>

                <div className="mt-8 flex justify-end">
                  <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => setPendingDelete(selected)}>
                    <Trash2 className="h-4 w-4" />
                    Delete page
                  </Button>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={`Delete "${pendingDelete?.title || "Untitled"}"`}
        description="Its subpages will move up to the parent location. This cannot be undone."
        onConfirm={confirmDeletePage}
      />
    </AuthGuard>
  );
}
