"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function StudyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Study page error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
      <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
      <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-6">
        An error occurred during the study session. Your progress has been saved.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset} className="gap-2">
          Try Again
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => router.push("/decks")}>
          Back to Decks
        </Button>
      </div>
    </div>
  );
}
