import { useState, useRef } from "react";
import { Link } from "wouter";
import { Heart, Share2, ThumbsUp, ChevronDown, ChevronUp } from "lucide-react";
import type { Video } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface VideoPlayerProps {
  video: Video;
  onFavoriteToggle?: () => void;
  isFavorite?: boolean;
}

function formatViewCount(count: string | undefined): string {
  if (!count) return "0";
  const num = parseInt(count, 10);
  return num.toLocaleString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function VideoPlayer({ video, onFavoriteToggle, isFavorite }: VideoPlayerProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const { toast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleShare = async () => {
    const url = `${window.location.origin}/watch/${video.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: video.title,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link copied",
          description: "Video link has been copied to clipboard",
        });
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          data-testid="video-player-iframe"
        />
      </div>

      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-foreground leading-tight" data-testid="text-video-title">
          {video.title}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <Link
                href={`/channel/${video.channelId}`}
                className="font-medium text-foreground hover:text-primary transition-colors"
                data-testid="link-channel"
              >
                {video.channelTitle}
              </Link>
              <span className="text-sm text-muted-foreground">
                {video.viewCount && `${formatViewCount(video.viewCount)} views`}
                {video.viewCount && " • "}
                {formatDate(video.publishedAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {video.likeCount && (
              <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
                <ThumbsUp className="h-4 w-4" />
                <span>{formatViewCount(video.likeCount)}</span>
              </Badge>
            )}
            <Button
              variant={isFavorite ? "default" : "secondary"}
              size="sm"
              onClick={onFavoriteToggle}
              className="gap-2"
              data-testid="button-favorite"
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
              <span className="hidden sm:inline">{isFavorite ? "Saved" : "Save"}</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleShare}
              className="gap-2"
              data-testid="button-share"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 border border-card-border">
          <div
            className={`text-sm text-foreground whitespace-pre-wrap ${
              !isDescriptionExpanded ? "line-clamp-3" : ""
            }`}
            data-testid="text-video-description"
          >
            {video.description || "No description available."}
          </div>
          {video.description && video.description.length > 200 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="mt-2 -ml-2 text-muted-foreground hover:text-foreground"
              data-testid="button-toggle-description"
            >
              {isDescriptionExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show more
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function VideoPlayerSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="w-full aspect-video rounded-xl" />
      <div className="space-y-4">
        <Skeleton className="h-7 w-3/4" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}
