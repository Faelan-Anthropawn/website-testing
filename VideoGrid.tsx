import type { Video } from "@shared/schema";
import { VideoCard, VideoCardSkeleton } from "./VideoCard";

interface VideoGridProps {
  videos: Video[];
  isLoading?: boolean;
  title?: string;
}

export function VideoGrid({ videos, isLoading, title }: VideoGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {title && (
          <h2 className="text-xl font-semibold text-foreground" data-testid={`text-section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {title}
          </h2>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-8 h-8 text-muted-foreground"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8" />
            <path d="M12 17v4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground">No videos found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Try searching for something else
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {title && (
        <h2 className="text-xl font-semibold text-foreground" data-testid={`text-section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {title}
        </h2>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}
