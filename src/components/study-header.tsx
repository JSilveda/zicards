"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, MoreVertical } from "lucide-react";

interface StudyHeaderProps {
  activityTitle: string;
  deckName: string;
  progress: number;
  onBack?: () => void;
}

export function StudyHeader({ activityTitle, deckName, progress, onBack }: StudyHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-14">
          {/* Back button */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 -ml-2"
            onClick={handleBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Center text */}
          <div className="flex-1 text-center min-w-0 px-2">
            <p className="text-xs text-muted-foreground truncate">{activityTitle}</p>
            <p className="text-sm font-semibold truncate">{deckName}</p>
          </div>

          {/* Menu dots */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 -mr-2"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="pb-2">
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>
    </div>
  );
}
