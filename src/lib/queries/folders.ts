import { createClient } from "@/lib/supabase/client";
import type { Folder } from "@/types";

export async function getFolders(): Promise<Folder[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", user.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as Folder[];
}

async function getNextFolderPosition(parentId: string | null): Promise<number> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  let query = supabase
    .from("folders")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1);

  query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);

  const { data } = await query;
  if (!data || data.length === 0) return 0;
  return ((data[0] as { position: number }).position ?? 0) + 1;
}

export async function createFolder(name: string, parentId: string | null): Promise<Folder> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const position = await getNextFolderPosition(parentId);

  const { data, error } = await supabase
    .from("folders")
    .insert({
      user_id: user.id,
      name: name.trim(),
      parent_id: parentId,
      position,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Folder;
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("folders")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

function getDescendantIds(folders: Folder[], rootId: string): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const f of folders) {
    if (!f.parent_id) continue;
    const list = childrenByParent.get(f.parent_id) || [];
    list.push(f.id);
    childrenByParent.set(f.parent_id, list);
  }
  const result = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    const children = childrenByParent.get(current) || [];
    for (const child of children) {
      if (!result.has(child)) {
        result.add(child);
        stack.push(child);
      }
    }
  }
  return result;
}

export async function moveFolder(
  folders: Folder[],
  id: string,
  newParentId: string | null
): Promise<void> {
  if (newParentId === id) throw new Error("Cannot move a folder into itself");
  if (newParentId && getDescendantIds(folders, id).has(newParentId)) {
    throw new Error("Cannot move a folder into one of its subfolders");
  }

  const supabase = createClient();
  const position = await getNextFolderPosition(newParentId);

  const { error } = await supabase
    .from("folders")
    .update({
      parent_id: newParentId,
      position,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function reorderFolders(orderedIds: string[]): Promise<void> {
  const supabase = createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("folders")
        .update({ position: index, updated_at: new Date().toISOString() })
        .eq("id", id)
    )
  );
}

export async function deleteFolder(
  folders: Folder[],
  id: string,
  moveDecksToFolder: (deckIds: string[], folderId: string | null) => Promise<void>,
  deckIdsInFolder: (folderId: string) => string[]
): Promise<void> {
  const folder = folders.find((f) => f.id === id);
  if (!folder) return;

  const newParentId = folder.parent_id;

  const childFolders = folders.filter((f) => f.parent_id === id);
  const supabase = createClient();

  await Promise.all(
    childFolders.map(async (child) => {
      const position = await getNextFolderPosition(newParentId);
      const { error } = await supabase
        .from("folders")
        .update({ parent_id: newParentId, position })
        .eq("id", child.id);
      if (error) throw error;
    })
  );

  const deckIds = deckIdsInFolder(id);
  if (deckIds.length > 0) {
    await moveDecksToFolder(deckIds, newParentId);
  }

  const { error } = await supabase.from("folders").delete().eq("id", id);
  if (error) throw error;
}

export { getDescendantIds };
