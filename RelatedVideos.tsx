import type { Video } from "@shared/schema";
import { VideoCard, VideoCardSkeleton } from "./VideoCard";

interface RelatedVideosProps {
  videos: Video[];
  isLoading?: boolean;
}

export function RelatedVideos({ videos, isLoading }: RelatedVideosProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Related Videos</h2>
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <VideoCardSkeleton key={i} variant="compact" />
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground" data-testid="text-related-videos">
        Related Videos
      </h2>
      <div className="space-y-4">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} variant="compact" />
        ))}
      </div>
    </div>
  );
}
