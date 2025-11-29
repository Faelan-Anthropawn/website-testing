import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { VideoGrid } from "@/components/VideoGrid";
import type { Video } from "@shared/schema";

export default function Home() {
  const { data: trendingVideos, isLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos/trending"],
  });

  const handleSearch = (query: string) => {
    // Navigation handled by Header component
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={handleSearch} />
      <main className="container mx-auto px-4 py-6 max-w-screen-2xl">
        <VideoGrid
          videos={trendingVideos || []}
          isLoading={isLoading}
          title="Trending"
        />
      </main>
    </div>
  );
}
