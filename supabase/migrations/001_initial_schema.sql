-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Decks table
create table if not exists decks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  source_language text not null default 'en',
  target_language text not null default 'es',
  description text,
  is_public boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Cards table
create table if not exists cards (
  id uuid default uuid_generate_v4() primary key,
  deck_id uuid references decks(id) on delete cascade not null,
  front text not null,
  back text not null,
  example text,
  transcription text,
  gender text,
  image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Reviews table (SRS)
create table if not exists reviews (
  id uuid default uuid_generate_v4() primary key,
  card_id uuid references cards(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  status text not null check (status in ('correct', 'incorrect')),
  interval_days integer not null default 1,
  next_review_date timestamp with time zone not null,
  box_number integer not null default 1 check (box_number between 1 and 7),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(card_id, user_id)
);

-- Indexes
create index if not exists idx_decks_user_id on decks(user_id);
create index if not exists idx_cards_deck_id on cards(deck_id);
create index if not exists idx_reviews_card_id on reviews(card_id);
create index if not exists idx_reviews_user_id on reviews(user_id);
create index if not exists idx_reviews_next_review on reviews(next_review_date);

-- RLS policies
alter table decks enable row level security;
alter table cards enable row level security;
alter table reviews enable row level security;

-- Decks policies
create policy "Users can view own decks" on decks
  for select using (auth.uid() = user_id);

create policy "Users can view public decks" on decks
  for select using (is_public = true);

create policy "Users can insert own decks" on decks
  for insert with check (auth.uid() = user_id);

create policy "Users can update own decks" on decks
  for update using (auth.uid() = user_id);

create policy "Users can delete own decks" on decks
  for delete using (auth.uid() = user_id);

-- Cards policies
create policy "Users can view cards in own decks" on cards
  for select using (
    exists (
      select 1 from decks
      where decks.id = cards.deck_id
      and decks.user_id = auth.uid()
    )
  );

create policy "Users can view cards in public decks" on cards
  for select using (
    exists (
      select 1 from decks
      where decks.id = cards.deck_id
      and decks.is_public = true
    )
  );

create policy "Users can insert cards in own decks" on cards
  for insert with check (
    exists (
      select 1 from decks
      where decks.id = cards.deck_id
      and decks.user_id = auth.uid()
    )
  );

create policy "Users can update cards in own decks" on cards
  for update using (
    exists (
      select 1 from decks
      where decks.id = cards.deck_id
      and decks.user_id = auth.uid()
    )
  );

create policy "Users can delete cards in own decks" on cards
  for delete using (
    exists (
      select 1 from decks
      where decks.id = cards.deck_id
      and decks.user_id = auth.uid()
    )
  );

-- Reviews policies
create policy "Users can view own reviews" on reviews
  for select using (auth.uid() = user_id);

create policy "Users can insert own reviews" on reviews
  for insert with check (auth.uid() = user_id);

create policy "Users can update own reviews" on reviews
  for update using (auth.uid() = user_id);
