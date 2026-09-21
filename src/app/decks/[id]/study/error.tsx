"use client";

import { useEffect, useState } from "react";
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
  const [details, setDetails] = useState("");

  useEffect(() => {
    console.error("Study page error:", error);
    setDetails(error?.message || "Unknown error");
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
      <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
      <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-2">
        An error occurred during the study session.
      </p>
      {details && (
        <pre className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg p-3 mb-6 max-w-lg overflow-auto">
          {details}
        </pre>
      )}
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
