-- Folders for organizing decks (supports nested subfolders) + manual ordering
-- IMPORTANT: run this in the Supabase SQL editor for both local and production projects.

-- Folders table
create table if not exists folders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  parent_id uuid references folders(id) on delete cascade,
  position integer not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Decks: folder assignment + manual ordering
alter table decks add column if not exists folder_id uuid references folders(id) on delete set null;
alter table decks add column if not exists position integer not null default 0;

-- Indexes
create index if not exists idx_folders_user_id on folders(user_id);
create index if not exists idx_folders_parent_id on folders(parent_id);
create index if not exists idx_decks_folder_id on decks(folder_id);
create index if not exists idx_decks_position on decks(position);

-- RLS
alter table folders enable row level security;

create policy "Users can view own folders" on folders
  for select using (auth.uid() = user_id);

create policy "Users can insert own folders" on folders
  for insert with check (auth.uid() = user_id);

create policy "Users can update own folders" on folders
  for update using (auth.uid() = user_id);

create policy "Users can delete own folders" on folders
  for delete using (auth.uid() = user_id);
