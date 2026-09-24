"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { DeckCard } from "@/components/deck-card";
import { FolderCard } from "@/components/folder-card";
import { MoveDialog } from "@/components/move-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getDecks, deleteDeck, moveDeckToFolder, updateDeck } from "@/lib/queries/decks";
import {
  getFolders,
  createFolder,
  renameFolder,
  moveFolder,
  deleteFolder,
  placeFolder,
  getDescendantIds,
} from "@/lib/queries/folders";
import {
  Plus,
  Search,
  Layers,
  FolderPlus,
  Home,
  ChevronRight,
} from "lucide-react";
import type { Deck, Folder } from "@/types";

const AuthGuard = dynamic(() => import("@/components/auth-guard").then(m => m.AuthGuard), { ssr: false });

interface DragItem {
  kind: "deck" | "folder";
  id: string;
}

interface DropTarget {
  type: "folder" | "deck" | "container" | "root";
  id?: string;
  before?: boolean;
  folderPosition?: "before" | "inside" | "after";
}

function sortByPosition<T extends { position?: number | null; created_at: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.created_at.localeCompare(b.created_at)
  );
}

export default function DecksPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersSupported, setFoldersSupported] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const [folderDialog, setFolderDialog] = useState<
    { type: "create"; parentId: string | null } | { type: "rename"; folder: Folder } | null
  >(null);
  const [folderName, setFolderName] = useState("");

  const [moveDialog, setMoveDialog] = useState<
    { kind: "deck" | "folder"; id: string; currentFolderId: string | null } | null
  >(null);

  const loadAll = useCallback(async () => {
    try {
      const data = await getDecks();
      setDecks(data);
    } catch (error) {
      console.error("Failed to load decks:", error);
    }
    try {
      const fdata = await getFolders();
      setFolders(fdata);
    } catch (error) {
      console.error("Folders not available:", error);
      setFoldersSupported(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this deck and all its cards?")) return;
    try {
      await deleteDeck(id);
      setDecks((prev) => prev.filter((d) => d.id !== id));
    } catch (error) {
      console.error("Failed to delete deck:", error);
    }
  };

  const folderById = (id: string | null) => folders.find((f) => f.id === id) || null;

  const ancestors: Folder[] = [];
  {
    let cur = folderById(currentFolderId);
    const guard = new Set<string>();
    while (cur && !guard.has(cur.id)) {
      guard.add(cur.id);
      ancestors.unshift(cur);
      cur = cur.parent_id ? folderById(cur.parent_id) : null;
    }
  }

  const childFolders = sortByPosition(folders.filter((f) => (f.parent_id ?? null) === currentFolderId));
  const decksInFolder = sortByPosition(decks.filter((d) => (d.folder_id ?? null) === currentFolderId));

  const isSearching = search.trim().length > 0;
  const filteredDecks = decks.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const applyDeckOrder = async (folderId: string | null, orderedIds: string[]) => {
    await Promise.all(
      orderedIds.map((id, index) => updateDeck(id, { folder_id: folderId, position: index }))
    );
  };

  const clearDrag = () => {
    setDragItem(null);
    setDropTarget(null);
  };

  const handleDragStart = (e: React.DragEvent, item: DragItem) => {
    e.dataTransfer.setData("text/plain", `${item.kind}:${item.id}`);
    e.dataTransfer.effectAllowed = "move";
    setDragItem(item);
  };

  const handleDeckDrop = async (e: React.DragEvent, targetDeck: Deck) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragItem || dragItem.kind !== "deck" || isSearching) {
      clearDrag();
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const before = e.clientY - rect.top < rect.height / 2;

    const siblings = decksInFolder.filter((d) => d.id !== dragItem.id);
    let idx = siblings.findIndex((d) => d.id === targetDeck.id);
    if (idx === -1) {
      clearDrag();
      return;
    }
    if (!before) idx += 1;
    const dragged = decks.find((d) => d.id === dragItem.id);
    if (!dragged) {
      clearDrag();
      return;
    }
    const newOrder = [...siblings];
    newOrder.splice(idx, 0, dragged);
    try {
      await applyDeckOrder(currentFolderId, newOrder.map((d) => d.id));
      await loadAll();
    } catch (error) {
      console.error("Failed to reorder decks:", error);
    }
    clearDrag();
  };

  const handleFolderDrop = async (
    e: React.DragEvent,
    folder: Folder,
    position: "before" | "inside" | "after" = "inside"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragItem || isSearching) {
      clearDrag();
      return;
    }
    try {
      if (dragItem.kind === "deck") {
        const deck = decks.find((d) => d.id === dragItem.id);
        if (deck && (deck.folder_id ?? null) !== folder.id) {
          await moveDeckToFolder(dragItem.id, folder.id);
          await loadAll();
        }
      } else {
        if (dragItem.id === folder.id || getDescendantIds(folders, dragItem.id).has(folder.id)) {
          clearDrag();
          return;
        }
        if (position === "inside") {
          await moveFolder(folders, dragItem.id, folder.id);
        } else {
          const newParentId = folder.parent_id;
          const siblings = sortByPosition(
            folders.filter(
              (f) => (f.parent_id ?? null) === (newParentId ?? null) && f.id !== dragItem.id
            )
          );
          let idx = siblings.findIndex((f) => f.id === folder.id);
          if (idx === -1) {
            clearDrag();
            return;
          }
          if (position === "after") idx += 1;
          const dragged = folders.find((f) => f.id === dragItem.id);
          if (!dragged) {
            clearDrag();
            return;
          }
          const newOrder = [...siblings];
          newOrder.splice(idx, 0, dragged);
          await Promise.all(
            newOrder.map((f, i) => placeFolder(f.id, newParentId, i))
          );
        }
        await loadAll();
      }
    } catch (error) {
      console.error("Failed to move into folder:", error);
    }
    clearDrag();
  };

  const handleContainerDrop = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    if (!dragItem || isSearching) {
      clearDrag();
      return;
    }
    try {
      if (dragItem.kind === "deck") {
        const deck = decks.find((d) => d.id === dragItem.id);
        if (deck && (deck.folder_id ?? null) !== folderId) {
          await moveDeckToFolder(dragItem.id, folderId);
          await loadAll();
        }
      } else {
        const folder = folders.find((f) => f.id === dragItem.id);
        if (folder && (folder.parent_id ?? null) !== folderId) {
          if (folderId && (folderId === folder.id || getDescendantIds(folders, folder.id).has(folderId))) {
            clearDrag();
            return;
          }
          await moveFolder(folders, dragItem.id, folderId);
          await loadAll();
        }
      }
    } catch (error) {
      console.error("Failed to move:", error);
    }
    clearDrag();
  };

  const openFolderDialog = (dialog: NonNullable<typeof folderDialog>) => {
    setFolderName(dialog.type === "rename" ? dialog.folder.name : "");
    setFolderDialog(dialog);
  };

  const handleSaveFolder = async () => {
    if (!folderName.trim() || !folderDialog) return;
    try {
      if (folderDialog.type === "create") {
        await createFolder(folderName, folderDialog.parentId);
      } else {
        await renameFolder(folderDialog.folder.id, folderName);
      }
      setFolderDialog(null);
      setFolderName("");
      await loadAll();
    } catch (error) {
      console.error("Failed to save folder:", error);
    }
  };

  const handleDeleteFolder = async (folder: Folder) => {
    const childCount = folders.filter((f) => f.parent_id === folder.id).length;
    const deckCount = decks.filter((d) => (d.folder_id ?? null) === folder.id).length;
    const detail =
      childCount + deckCount > 0
        ? ` Su contenido (${deckCount} deck(s), ${childCount} subcarpeta(s)) se moverá a la carpeta superior.`
        : "";
    if (!confirm(`Eliminar la carpeta "${folder.name}"?${detail}`)) return;
    try {
      await deleteFolder(
        folders,
        folder.id,
        async (deckIds, targetId) => {
          await Promise.all(deckIds.map((id) => moveDeckToFolder(id, targetId)));
        },
        (fid) => decks.filter((d) => (d.folder_id ?? null) === fid).map((d) => d.id)
      );
      if (currentFolderId === folder.id) {
        setCurrentFolderId(folder.parent_id);
      }
      await loadAll();
    } catch (error) {
      console.error("Failed to delete folder:", error);
    }
  };

  const handleMoveSelect = async (targetFolderId: string | null) => {
    if (!moveDialog) return;
    try {
      if (moveDialog.kind === "deck") {
        await moveDeckToFolder(moveDialog.id, targetFolderId);
      } else {
        await moveFolder(folders, moveDialog.id, targetFolderId);
      }
      setMoveDialog(null);
      await loadAll();
    } catch (error) {
      console.error("Failed to move:", error);
      alert(error instanceof Error ? error.message : "No se pudo mover");
    }
  };

  const moveDisabledIds = moveDialog?.kind === "folder"
    ? getDescendantIds(folders, moveDialog.id)
    : undefined;

  const currentFolder = folderById(currentFolderId);

  return (
    <AuthGuard>
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Decks</h1>
            <p className="text-muted-foreground">
              {decks.length} deck{decks.length !== 1 ? "s" : ""}
              {foldersSupported && folders.length > 0 &&
                ` · ${folders.length} carpeta${folders.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex gap-2">
            {foldersSupported && (
              <Button
                variant="outline"
                className="gap-1"
                onClick={() => openFolderDialog({ type: "create", parentId: currentFolderId })}
              >
                <FolderPlus className="h-4 w-4" />
                Carpeta
              </Button>
            )}
            <Link href={currentFolderId ? `/decks/new?folder=${currentFolderId}` : "/decks/new"}>
              <Button className="gap-1">
                <Plus className="h-4 w-4" />
                New Deck
              </Button>
            </Link>
          </div>
        </div>

        {foldersSupported && (currentFolderId || ancestors.length > 0) && (
          <nav className="flex items-center gap-1 text-sm mb-4 flex-wrap">
            <button
              onClick={() => setCurrentFolderId(null)}
              onDragOver={(e) => {
                if (dragItem) {
                  e.preventDefault();
                  setDropTarget({ type: "root" });
                }
              }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => handleContainerDrop(e, null)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted transition-colors ${
                dropTarget?.type === "root" ? "bg-primary/10 outline outline-2 outline-primary" : ""
              }`}
            >
              <Home className="h-4 w-4" />
              Mis decks
            </button>
            {ancestors.map((f) => (
              <span key={f.id} className="flex items-center gap-1">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <button
                  onClick={() => setCurrentFolderId(f.id)}
                  className={`px-2 py-1 rounded-lg hover:bg-muted transition-colors ${
                    f.id === currentFolderId ? "font-semibold" : ""
                  }`}
                >
                  {f.name}
                </button>
              </span>
            ))}
          </nav>
        )}

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search decks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : isSearching ? (
          <div className="space-y-4">
            {filteredFolders.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Carpetas</p>
                {filteredFolders.map((f) => (
                  <FolderCard
                    key={f.id}
                    name={f.name}
                    deckCount={decks.filter((d) => (d.folder_id ?? null) === f.id).length}
                    subfolderCount={folders.filter((x) => x.parent_id === f.id).length}
                    onOpen={() => {
                      setCurrentFolderId(f.id);
                      setSearch("");
                    }}
                    onNewDeck={() => router.push(`/decks/new?folder=${f.id}`)}
                    onNewSubfolder={() => openFolderDialog({ type: "create", parentId: f.id })}
                    onRename={() => openFolderDialog({ type: "rename", folder: f })}
                    onMove={() => setMoveDialog({ kind: "folder", id: f.id, currentFolderId: f.parent_id })}
                    onDelete={() => handleDeleteFolder(f)}
                  />
                ))}
              </div>
            )}
            {filteredDecks.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Decks</p>
                {filteredDecks.map((deck) => (
                  <div key={deck.id}>
                    <DeckCard deck={deck} onDelete={handleDelete} onMove={(id) => setMoveDialog({ kind: "deck", id, currentFolderId: deck.folder_id ?? null })} />
                    {deck.folder_id && (
                      <p className="text-xs text-muted-foreground mt-1 ml-1">
                        en {folderById(deck.folder_id)?.name ?? "?"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {filteredDecks.length === 0 && filteredFolders.length === 0 && (
              <div className="text-center py-16">
                <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No matching decks</h3>
                <p className="text-muted-foreground mb-4">Try a different search term</p>
              </div>
            )}
          </div>
        ) : (
          <div
            className="space-y-4"
            onDragOver={(e) => {
              if (dragItem) e.preventDefault();
            }}
            onDrop={(e) => handleContainerDrop(e, currentFolderId)}
          >
            {foldersSupported && childFolders.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Carpetas</p>
                {childFolders.map((f) => {
                  const isDropTarget = dropTarget?.type === "folder" && dropTarget.id === f.id;
                  const folderPos = isDropTarget ? dropTarget.folderPosition ?? "inside" : null;
                  return (
                    <div
                      key={f.id}
                      className={`rounded-2xl transition-all ${
                        isDropTarget && folderPos !== "inside"
                          ? folderPos === "before"
                            ? "outline outline-2 outline-primary outline-offset-2 -translate-y-0.5"
                            : "outline outline-2 outline-primary outline-offset-2 translate-y-0.5"
                          : ""
                      }`}
                    >
                      <FolderCard
                        name={f.name}
                        deckCount={decks.filter((d) => (d.folder_id ?? null) === f.id).length}
                        subfolderCount={folders.filter((x) => x.parent_id === f.id).length}
                        dropHighlight={isDropTarget && folderPos === "inside"}
                        draggable
                        onOpen={() => setCurrentFolderId(f.id)}
                        onNewDeck={() => router.push(`/decks/new?folder=${f.id}`)}
                        onNewSubfolder={() => openFolderDialog({ type: "create", parentId: f.id })}
                        onRename={() => openFolderDialog({ type: "rename", folder: f })}
                        onMove={() => setMoveDialog({ kind: "folder", id: f.id, currentFolderId: f.parent_id })}
                        onDelete={() => handleDeleteFolder(f)}
                        onDragStart={(e) => handleDragStart(e, { kind: "folder", id: f.id })}
                        onDragOver={(e) => {
                          if (dragItem && dragItem.id !== f.id) {
                            e.preventDefault();
                            e.stopPropagation();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const ratio = (e.clientY - rect.top) / rect.height;
                            const folderPosition =
                              ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside";
                            setDropTarget({ type: "folder", id: f.id, folderPosition });
                          }
                        }}
                        onDragLeave={() => setDropTarget(null)}
                        onDrop={(e) => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          const ratio = (e.clientY - rect.top) / rect.height;
                          const folderPosition =
                            ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside";
                          handleFolderDrop(e, f, folderPosition);
                        }}
                        onDragEnd={clearDrag}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2">
              {(foldersSupported && (childFolders.length > 0 || currentFolder)) && (
                <p className="text-sm text-muted-foreground">
                  Decks{currentFolder ? ` en ${currentFolder.name}` : ""}
                </p>
              )}
              {decksInFolder.map((deck) => (
                <div
                  key={deck.id}
                  draggable={!isSearching}
                  onDragStart={(e) => handleDragStart(e, { kind: "deck", id: deck.id })}
                  onDragOver={(e) => {
                    if (dragItem?.kind === "deck" && dragItem.id !== deck.id) {
                      e.preventDefault();
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setDropTarget({
                        type: "deck",
                        id: deck.id,
                        before: e.clientY - rect.top < rect.height / 2,
                      });
                    }
                  }}
                  onDragLeave={() => setDropTarget(null)}
                  onDrop={(e) => handleDeckDrop(e, deck)}
                  onDragEnd={clearDrag}
                  className={`rounded-2xl transition-all ${
                    dropTarget?.type === "deck" && dropTarget.id === deck.id
                      ? dropTarget.before
                        ? "outline outline-2 outline-primary outline-offset-2 -translate-y-0.5"
                        : "outline outline-2 outline-primary outline-offset-2 translate-y-0.5"
                      : ""
                  }`}
                >
                  <DeckCard
                    deck={deck}
                    onDelete={handleDelete}
                    onMove={(id) => setMoveDialog({ kind: "deck", id, currentFolderId: deck.folder_id ?? null })}
                  />
                </div>
              ))}
              {decksInFolder.length === 0 && childFolders.length === 0 && (
                <div className="text-center py-16">
                  <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {currentFolder ? "Carpeta vacía" : "No decks yet"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {currentFolder
                      ? "Crea un deck o mueve decks aquí"
                      : "Create your first deck to start learning"}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Link href={currentFolderId ? `/decks/new?folder=${currentFolderId}` : "/decks/new"}>
                      <Button className="gap-1">
                        <Plus className="h-4 w-4" />
                        Create Deck
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
              {decksInFolder.length === 0 && childFolders.length > 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Arrastra decks aquí o crea uno nuevo
                </p>
              )}
            </div>
          </div>
        )}

        <Dialog open={folderDialog !== null} onOpenChange={(open) => !open && setFolderDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {folderDialog?.type === "rename" ? "Renombrar carpeta" : "Nueva carpeta"}
              </DialogTitle>
            </DialogHeader>
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Nombre de la carpeta"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveFolder();
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setFolderDialog(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveFolder} disabled={!folderName.trim()}>
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {moveDialog && (
          <MoveDialog
            open={moveDialog !== null}
            onOpenChange={(open) => !open && setMoveDialog(null)}
            title={moveDialog.kind === "deck" ? "Mover deck" : "Mover carpeta"}
            folders={folders}
            currentFolderId={moveDialog.currentFolderId}
            disabledIds={moveDisabledIds}
            onSelect={handleMoveSelect}
          />
        )}
      </main>
    </AuthGuard>
  );
}
