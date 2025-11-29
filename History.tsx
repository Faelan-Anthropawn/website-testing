import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Trash2, Clock } from "lucide-react";
import {
  getWatchHistory,
  clearWatchHistory,
  removeFromWatchHistory,
} from "@/lib/storage";
import type { WatchHistoryItem } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function History() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setHistory(getWatchHistory());
  }, []);

  const handleClearHistory = () => {
    clearWatchHistory();
    setHistory([]);
    toast({
      title: "History cleared",
      description: "Your watch history has been cleared",
    });
  };

  const handleRemoveItem = (videoId: string) => {
    removeFromWatchHistory(videoId);
    setHistory(history.filter((item) => item.videoId !== videoId));
  };

  const handleSearch = (query: string) => {
    // Navigation handled by Header component
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={handleSearch} />
      <main className="container mx-auto px-4 py-6 max-w-screen-2xl">
        <div className="flex items-center justify-between mb-6 gap-4">
          <h1 className="text-xl font-semibold text-foreground" data-testid="text-history-title">
            Watch History
          </h1>
          {history.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-2" data-testid="button-clear-history">
                  <Trash2 className="h-4 w-4" />
                  Clear History
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear watch history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your entire watch history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearHistory}>
                    Clear History
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {history.length > 0 ? (
          <div className="space-y-4">
            {history.map((item) => (
              <div key={item.videoId} className="group relative">
                <VideoCard video={item.video} variant="list" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemoveItem(item.videoId);
                  }}
                  data-testid={`button-remove-history-${item.videoId}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No watch history</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Videos you watch will appear here
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
