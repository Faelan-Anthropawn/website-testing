import { useQuery } from "@tanstack/react-query";
import { ThumbsUp, MessageCircle } from "lucide-react";
import type { Comment } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CommentsProps {
  videoId: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
  if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return "Today";
}

function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export function Comments({ videoId }: CommentsProps) {
  const { data: comments, isLoading } = useQuery<Comment[]>({
    queryKey: [`/api/videos/${videoId}/comments`],
    enabled: !!videoId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 mt-6">
        <h2 className="text-lg font-semibold text-foreground">Comments</h2>
        <div className="space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!comments || comments.length === 0) {
    return (
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Comments</h2>
        <div className="flex flex-col items-center justify-center py-8 text-center bg-card rounded-xl border border-card-border">
          <MessageCircle className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Comments are disabled or not available for this video
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-foreground mb-4" data-testid="text-comments-title">
        {comments.length} Comments
      </h2>
      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4" data-testid={`comment-${comment.id}`}>
            <Avatar className="w-10 h-10 shrink-0">
              <AvatarImage src={comment.authorProfileImage} alt={comment.authorName} />
              <AvatarFallback>{comment.authorName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-foreground">
                  {comment.authorName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(comment.publishedAt)}
                </span>
              </div>
              <p
                className="text-sm text-foreground mt-1 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: comment.text }}
              />
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{formatCount(comment.likeCount)}</span>
                </div>
                {comment.replyCount && comment.replyCount > 0 && (
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{comment.replyCount} replies</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
