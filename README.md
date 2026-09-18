# ZiCards

A modern flashcard application for learning languages with spaced repetition.

## Features

- **Deck Management**: Create, edit, and organize flashcard decks by language pairs
- **Spaced Repetition (SRS)**: Leitner box system (7 boxes) for optimal retention
- **Import/Export**: CSV/Excel support for bulk card management
- **Text-to-Speech**: Hear pronunciation in multiple languages
- **Dark/Light Theme**: Toggle between themes
- **Responsive**: Works on mobile, tablet, and desktop
- **Auth**: Email/password + Google OAuth via Supabase

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript
- TailwindCSS
- Supabase (Auth + PostgreSQL + RLS)
- Recharts (charts)
- Lucide React (icons)

## Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to Settings → API and copy the URL and anon key

### 2. Run Database Migrations

In the Supabase SQL Editor, run the migrations in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_seed_data.sql` (optional, replace `YOUR_USER_ID` with your auth user UUID)

### 3. Configure Environment

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## CSV Format

Required columns: `front`, `back`

Optional columns: `example`, `transcription`, `gender`, `image_url`

Example:
```csv
front,back,example,transcription,gender
Hello,Hola,Hello how are you?,/həˈloʊ/,
Water,Agua,Can I have some water?,/ˈwɔːtər/,
Book,Libro,I am reading a book,/bʊk/,m
```

## SRS Algorithm

Uses a simplified Leitner system with 7 boxes:

| Box | Interval |
|-----|----------|
| 1   | 1 day    |
| 2   | 2 days   |
| 3   | 4 days   |
| 4   | 7 days   |
| 5   | 15 days  |
| 6   | 30 days  |
| 7   | 90 days  |

- Correct answer: move to next box
- Incorrect answer: move back to box 1
