/** Three-level grade: missed (forgot), effort (recalled with difficulty), easy. */
export type ReviewGrade = "missed" | "effort" | "easy";

export function calculateNextReview(
  boxNumber: number,
  grade: ReviewGrade
): { nextBox: number; intervalDays: number } {
  const BOX_INTERVALS = [1, 2, 4, 7, 15, 30, 90];

  if (grade === "missed") {
    return {
      nextBox: 1,
      intervalDays: BOX_INTERVALS[0],
    };
  }

  if (grade === "effort") {
    // Recalled with difficulty: keep the same box so it repeats sooner.
    const box = Math.min(Math.max(boxNumber, 1), 7);
    return {
      nextBox: box,
      intervalDays: BOX_INTERVALS[box - 1],
    };
  }

  const nextBox = Math.min(boxNumber + 1, 7);
  return {
    nextBox,
    intervalDays: BOX_INTERVALS[nextBox - 1],
  };
}

export function getNextReviewDate(intervalDays: number): Date {
  const now = new Date();
  now.setDate(now.getDate() + intervalDays);
  return now;
}

export function isCardDueForReview(review: {
  next_review_date: string;
} | null): boolean {
  if (!review) return true;
  return new Date(review.next_review_date) <= new Date();
}
