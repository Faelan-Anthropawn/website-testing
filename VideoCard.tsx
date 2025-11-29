import { Link } from "wouter";
import { Clock, Eye } from "lucide-react";
import type { Video } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoCardProps {
  video: Video;
  variant?: "grid" | "list" | "compact";
}

function formatViewCount(count: string | undefined): string {
  if (!count) return "";
  const num = parseInt(count, 10);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M views`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K views`;
  }
  return `${num} views`;
}

function formatDuration(duration: string | undefined): string {
  if (!duration) return "";
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatPublishedDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
  if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

export function VideoCard({ video, variant = "grid" }: VideoCardProps) {
  if (variant === "compact") {
    return (
      <Link
        href={`/watch/${video.id}`}
        className="flex gap-3 group hover-elevate rounded-md p-2 -m-2"
        data-testid={`card-video-compact-${video.id}`}
      >
        <div className="relative shrink-0 w-40 aspect-video rounded-md overflow-hidden bg-muted">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
          {video.duration && (
            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded font-mono">
              {formatDuration(video.duration)}
            </span>
          )}
        </div>
        <div className="flex flex-col min-w-0 py-0.5">
          <h3 className="font-medium text-sm line-clamp-2 text-foreground group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{video.channelTitle}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            {video.viewCount && <span>{formatViewCount(video.viewCount)}</span>}
            <span>{formatPublishedDate(video.publishedAt)}</span>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "list") {
    return (
      <Link
        href={`/watch/${video.id}`}
        className="flex gap-4 group hover-elevate rounded-lg p-3 -m-3"
        data-testid={`card-video-list-${video.id}`}
      >
        <div className="relative shrink-0 w-64 aspect-video rounded-lg overflow-hidden bg-muted">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
          {video.duration && (
            <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
              {formatDuration(video.duration)}
            </span>
          )}
        </div>
        <div className="flex flex-col min-w-0 py-1">
          <h3 className="font-medium text-base line-clamp-2 text-foreground group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            {video.viewCount && <span>{formatViewCount(video.viewCount)}</span>}
            <span className="text-muted-foreground/50">•</span>
            <span>{formatPublishedDate(video.publishedAt)}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{video.channelTitle}</p>
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {video.description}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/watch/${video.id}`}
      className="group flex flex-col hover-elevate rounded-lg"
      data-testid={`card-video-${video.id}`}
    >
      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
        />
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
            {formatDuration(video.duration)}
          </span>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6 text-white ml-1"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-3">
        <div className="flex flex-col min-w-0 flex-1">
          <h3 className="font-medium text-sm line-clamp-2 text-foreground group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{video.channelTitle}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            {video.viewCount && (
              <>
                <span>{formatViewCount(video.viewCount)}</span>
                <span className="text-muted-foreground/50">•</span>
              </>
            )}
            <span>{formatPublishedDate(video.publishedAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function VideoCardSkeleton({ variant = "grid" }: { variant?: "grid" | "list" | "compact" }) {
  if (variant === "compact") {
    return (
      <div className="flex gap-3">
        <Skeleton className="w-40 aspect-video rounded-md shrink-0" />
        <div className="flex flex-col flex-1 py-0.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4 mt-1" />
          <Skeleton className="h-3 w-24 mt-2" />
          <Skeleton className="h-3 w-32 mt-1" />
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="flex gap-4">
        <Skeleton className="w-64 aspect-video rounded-lg shrink-0" />
        <div className="flex flex-col flex-1 py-1">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4 mt-1" />
          <Skeleton className="h-4 w-40 mt-3" />
          <Skeleton className="h-4 w-28 mt-1" />
          <Skeleton className="h-4 w-full mt-3" />
          <Skeleton className="h-4 w-2/3 mt-1" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Skeleton className="aspect-video rounded-lg" />
      <div className="flex gap-3 mt-3">
        <div className="flex flex-col flex-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4 mt-1" />
          <Skeleton className="h-3 w-24 mt-2" />
          <Skeleton className="h-3 w-32 mt-1" />
        </div>
      </div>
    </div>
  );
}
