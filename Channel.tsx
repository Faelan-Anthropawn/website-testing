import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Header } from "@/components/Header";
import { VideoGrid } from "@/components/VideoGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Video } from "lucide-react";
import type { Channel as ChannelType, Video as VideoType } from "@shared/schema";

function formatCount(count: string | undefined): string {
  if (!count) return "0";
  const num = parseInt(count, 10);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export default function Channel() {
  const params = useParams();
  const channelId = params.id;

  const { data: channel, isLoading: channelLoading } = useQuery<ChannelType>({
    queryKey: [`/api/channels/${channelId}`],
    enabled: !!channelId,
  });

  const { data: videos, isLoading: videosLoading } = useQuery<VideoType[]>({
    queryKey: [`/api/channels/${channelId}/videos`],
    enabled: !!channelId,
  });

  const handleSearch = (query: string) => {
    // Navigation handled by Header component
  };

  if (!channelId) {
    return (
      <div className="min-h-screen bg-background">
        <Header onSearch={handleSearch} />
        <main className="container mx-auto px-4 py-6 max-w-screen-2xl">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <h3 className="text-lg font-medium text-foreground">Channel not found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              The channel you're looking for doesn't exist
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
        {channelLoading ? (
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <Skeleton className="w-24 h-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </div>
        ) : channel ? (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-border">
              <Avatar className="w-24 h-24">
                <AvatarImage src={channel.thumbnailUrl} alt={channel.title} />
                <AvatarFallback className="text-2xl">{channel.title[0]}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground" data-testid="text-channel-title">
                  {channel.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {channel.subscriberCount && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>{formatCount(channel.subscriberCount)} subscribers</span>
                    </div>
                  )}
                  {channel.videoCount && (
                    <div className="flex items-center gap-1.5">
                      <Video className="w-4 h-4" />
                      <span>{formatCount(channel.videoCount)} videos</span>
                    </div>
                  )}
                </div>
                {channel.description && (
                  <p className="text-sm text-muted-foreground max-w-2xl line-clamp-2">
                    {channel.description}
                  </p>
                )}
              </div>
            </div>

            <VideoGrid
              videos={videos || []}
              isLoading={videosLoading}
              title="Videos"
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
