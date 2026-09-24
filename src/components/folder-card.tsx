"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Folder as FolderIcon,
  MoreHorizontal,
  FolderPlus,
  Plus,
  Pencil,
  FolderInput,
  Trash2,
  FolderOpen,
} from "lucide-react";

interface FolderCardProps {
  name: string;
  deckCount: number;
  subfolderCount: number;
  dropHighlight?: boolean;
  draggable?: boolean;
  onOpen: () => void;
  onNewDeck: () => void;
  onNewSubfolder: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export function FolderCard({
  name,
  deckCount,
  subfolderCount,
  dropHighlight,
  draggable,
  onOpen,
  onNewDeck,
  onNewSubfolder,
  onRename,
  onMove,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: FolderCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const menuItem =
    "w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left";

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={`relative cursor-pointer rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all p-4 ${
        dropHighlight ? "border-primary border-2 bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          {dropHighlight ? (
            <FolderOpen className="h-5 w-5 text-primary" />
          ) : (
            <FolderIcon className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate">{name}</h3>
          <p className="text-xs text-muted-foreground">
            {deckCount} deck{deckCount !== 1 ? "s" : ""}
            {subfolderCount > 0 &&
              ` · ${subfolderCount} subcarpeta${subfolderCount !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="relative shrink-0" ref={menuRef}>
          <Button
            size="icon"
            variant="ghost"
            className="w-10 h-10"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-card border rounded-xl shadow-lg z-20 overflow-hidden">
              <button
                className={menuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onOpen();
                }}
              >
                <FolderOpen className="h-4 w-4" />
                Abrir
              </button>
              <button
                className={menuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onNewDeck();
                }}
              >
                <Plus className="h-4 w-4" />
                Nuevo deck aquí
              </button>
              <button
                className={menuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onNewSubfolder();
                }}
              >
                <FolderPlus className="h-4 w-4" />
                Nueva subcarpeta
              </button>
              <button
                className={menuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onRename();
                }}
              >
                <Pencil className="h-4 w-4" />
                Renombrar
              </button>
              <button
                className={menuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onMove();
                }}
              >
                <FolderInput className="h-4 w-4" />
                Mover
              </button>
              <button
                className={`${menuItem} text-destructive`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
