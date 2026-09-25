import { createClient } from "@/lib/supabase/client";
import type { NotePage } from "@/types";

function getDescendantIds(pages: NotePage[], rootId: string): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const p of pages) {
    if (!p.parent_id) continue;
    const list = childrenByParent.get(p.parent_id) || [];
    list.push(p.id);
    childrenByParent.set(p.parent_id, list);
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

export async function getNotePages(): Promise<NotePage[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("note_pages")
    .select("*")
    .eq("user_id", user.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as NotePage[];
}

async function getNextPosition(parentId: string | null): Promise<number> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  let query = supabase
    .from("note_pages")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1);

  query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);

  const { data } = await query;
  if (!data || data.length === 0) return 0;
  return ((data[0] as { position: number }).position ?? 0) + 1;
}

export async function createNotePage(
  title: string,
  parentId: string | null,
  icon: string | null = null
): Promise<NotePage> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const position = await getNextPosition(parentId);

  const { data, error } = await supabase
    .from("note_pages")
    .insert({
      user_id: user.id,
      title: title.trim() || "Untitled",
      content: [],
      icon,
      parent_id: parentId,
      position,
    })
    .select()
    .single();

  if (error) throw error;
  return data as NotePage;
}

export async function updateNotePage(
  id: string,
  patch: Partial<Pick<NotePage, "title" | "content" | "icon" | "parent_id" | "position">>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("note_pages")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function placeNotePage(
  id: string,
  parentId: string | null,
  position: number
): Promise<void> {
  await updateNotePage(id, { parent_id: parentId, position });
}

export async function moveNotePage(
  pages: NotePage[],
  id: string,
  newParentId: string | null
): Promise<void> {
  if (newParentId === id) throw new Error("Cannot move a page into itself");
  if (newParentId && getDescendantIds(pages, id).has(newParentId)) {
    throw new Error("Cannot move a page into one of its subpages");
  }
  const position = await getNextPosition(newParentId);
  await placeNotePage(id, newParentId, position);
}

export function getNoteDescendantIds(pages: NotePage[], id: string): Set<string> {
  return getDescendantIds(pages, id);
}

/** Delete a page; its subpages move up to the deleted page's parent. */
export async function deleteNotePage(pages: NotePage[], id: string): Promise<void> {
  const page = pages.find((p) => p.id === id);
  if (!page) return;

  const newParentId = page.parent_id;
  const children = pages.filter((p) => p.parent_id === id);

  await Promise.all(
    children.map(async (child) => {
      const position = await getNextPosition(newParentId);
      await placeNotePage(child.id, newParentId, position);
    })
  );

  const supabase = createClient();
  const { error } = await supabase.from("note_pages").delete().eq("id", id);
  if (error) throw error;
}
