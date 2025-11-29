import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Header } from "@/components/Header";
import { VideoPlayer, VideoPlayerSkeleton } from "@/components/VideoPlayer";
import { RelatedVideos } from "@/components/RelatedVideos";
import { Comments } from "@/components/Comments";
import type { Video } from "@shared/schema";
import {
  addToWatchHistory,
  isFavorite as checkIsFavorite,
  toggleFavorite,
} from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

export default function Watch() {
  const params = useParams();
  const videoId = params.id;
  const [isFavorite, setIsFavorite] = useState(false);
  const { toast } = useToast();

  const { data: video, isLoading: videoLoading } = useQuery<Video>({
    queryKey: [`/api/videos/${videoId}`],
    enabled: !!videoId,
  });

  const { data: relatedVideos, isLoading: relatedLoading } = useQuery<Video[]>({
    queryKey: [`/api/videos/${videoId}/related`],
    enabled: !!videoId,
  });

  useEffect(() => {
    if (video) {
      addToWatchHistory(video);
      setIsFavorite(checkIsFavorite(video.id));
    }
  }, [video]);

  useEffect(() => {
    if (videoId) {
      setIsFavorite(checkIsFavorite(videoId));
    }
  }, [videoId]);

  const handleFavoriteToggle = () => {
    if (video) {
      const nowFavorite = toggleFavorite(video);
      setIsFavorite(nowFavorite);
      toast({
        title: nowFavorite ? "Added to favorites" : "Removed from favorites",
        description: nowFavorite
          ? "Video has been saved to your favorites"
          : "Video has been removed from your favorites",
      });
    }
  };

  const handleSearch = (query: string) => {
    // Navigation handled by Header component
  };

  if (!videoId) {
    return (
      <div className="min-h-screen bg-background">
        <Header onSearch={handleSearch} />
        <main className="container mx-auto px-4 py-6 max-w-screen-2xl">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <h3 className="text-lg font-medium text-foreground">Video not found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              The video you're looking for doesn't exist
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={handleSearch} />
      <main className="container mx-auto px-4 py-6 max-w-screen-2xl">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 lg:max-w-4xl">
            {videoLoading || !video ? (
              <VideoPlayerSkeleton />
            ) : (
              <VideoPlayer
                video={video}
                isFavorite={isFavorite}
                onFavoriteToggle={handleFavoriteToggle}
              />
            )}
            {videoId && <Comments videoId={videoId} />}
          </div>
          <aside className="lg:w-96 shrink-0">
            <RelatedVideos
              videos={relatedVideos || []}
              isLoading={relatedLoading}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
