"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Folder as FolderIcon, Home } from "lucide-react";
import type { Folder } from "@/types";

interface TreeNode {
  folder: Folder;
  depth: number;
}

function buildTree(folders: Folder[], parentId: string | null, depth: number): TreeNode[] {
  const nodes: TreeNode[] = [];
  const children = folders
    .filter((f) => (f.parent_id ?? null) === parentId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  for (const child of children) {
    nodes.push({ folder: child, depth });
    nodes.push(...buildTree(folders, child.id, depth + 1));
  }
  return nodes;
}

interface MoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  folders: Folder[];
  currentFolderId: string | null;
  disabledIds?: Set<string>;
  onSelect: (folderId: string | null) => void;
}

export function MoveDialog({
  open,
  onOpenChange,
  title,
  folders,
  currentFolderId,
  disabledIds,
  onSelect,
}: MoveDialogProps) {
  const tree = buildTree(folders, null, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto space-y-1">
          <button
            disabled={currentFolderId === null}
            onClick={() => onSelect(null)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-default"
          >
            <Home className="h-4 w-4 shrink-0" />
            <span className="truncate">Mis decks (raíz)</span>
            {currentFolderId === null && (
              <span className="ml-auto text-xs text-muted-foreground">actual</span>
            )}
          </button>
          {tree.map(({ folder, depth }) => {
            const disabled =
              folder.id === currentFolderId || disabledIds?.has(folder.id);
            return (
              <button
                key={folder.id}
                disabled={disabled}
                onClick={() => onSelect(folder.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-default"
                style={{ paddingLeft: `${12 + depth * 20}px` }}
              >
                <FolderIcon className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{folder.name}</span>
                {folder.id === currentFolderId && (
                  <span className="ml-auto text-xs text-muted-foreground">actual</span>
                )}
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
