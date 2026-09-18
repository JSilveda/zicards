export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Deck {
  id: string;
  user_id: string;
  name: string;
  source_language: string;
  target_language: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  card_count?: number;
  learned_count?: number;
  due_count?: number;
  progress_percent?: number;
}

export interface Card {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  example: string | null;
  transcription: string | null;
  gender: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  card_id: string;
  user_id: string;
  status: "correct" | "incorrect";
  interval_days: number;
  next_review_date: string;
  box_number: number;
  created_at: string;
  updated_at: string;
}

export interface StudySession {
  cards: Card[];
  reviews: Review[];
  currentIndex: number;
  correctCount: number;
  incorrectCount: number;
  isComplete: boolean;
}

export interface DashboardStats {
  totalDecks: number;
  totalCards: number;
  cardsToReviewToday: number;
  streak: number;
  weeklyProgress: { day: string; cardsStudied: number }[];
}
