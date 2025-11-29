import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Trash2, Heart } from "lucide-react";
import { getFavorites, removeFromFavorites } from "@/lib/storage";
import type { FavoriteItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Favorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const handleRemoveItem = (videoId: string) => {
    removeFromFavorites(videoId);
    setFavorites(favorites.filter((item) => item.videoId !== videoId));
    toast({
      title: "Removed from favorites",
      description: "Video has been removed from your favorites",
    });
  };

  const handleSearch = (query: string) => {
    // Navigation handled by Header component
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={handleSearch} />
      <main className="container mx-auto px-4 py-6 max-w-screen-2xl">
        <h1 className="text-xl font-semibold text-foreground mb-6" data-testid="text-favorites-title">
          Favorites
        </h1>

        {favorites.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((item) => (
              <div key={item.videoId} className="group relative">
                <VideoCard video={item.video} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemoveItem(item.videoId);
                  }}
                  data-testid={`button-remove-favorite-${item.videoId}`}
                >
                  <Trash2 className="h-4 w-4 text-white" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No favorites yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Save videos to watch them later
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
