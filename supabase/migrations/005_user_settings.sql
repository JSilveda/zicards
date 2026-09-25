-- Per-user app settings (branding logo, future preferences).
-- IMPORTANT: run this in the Supabase SQL editor for both local and production projects.

create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  logo_data text,
  updated_at timestamp with time zone default now()
);

alter table user_settings enable row level security;

create policy "Users can view own settings" on user_settings
  for select using (auth.uid() = user_id);

create policy "Users can insert own settings" on user_settings
  for insert with check (auth.uid() = user_id);

create policy "Users can update own settings" on user_settings
  for update using (auth.uid() = user_id);
