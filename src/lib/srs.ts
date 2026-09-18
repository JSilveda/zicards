export function calculateNextReview(
  boxNumber: number,
  correct: boolean
): { nextBox: number; intervalDays: number } {
  const BOX_INTERVALS = [1, 2, 4, 7, 15, 30, 90];

  if (correct) {
    const nextBox = Math.min(boxNumber + 1, 7);
    return {
      nextBox,
      intervalDays: BOX_INTERVALS[nextBox - 1],
    };
  } else {
    return {
      nextBox: 1,
      intervalDays: BOX_INTERVALS[0],
    };
  }
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
