import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Header } from "@/components/Header";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import type { SearchResult } from "@shared/schema";

export default function Search() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const query = params.get("q") || "";

  const { data, isLoading } = useQuery<SearchResult>({
    queryKey: [`/api/videos/search?q=${encodeURIComponent(query)}`],
    enabled: !!query,
  });

  const handleSearch = (newQuery: string) => {
    // Navigation handled by Header component
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={handleSearch} initialQuery={query} />
      <main className="container mx-auto px-4 py-6 max-w-screen-2xl">
        {query && (
          <h1 className="text-xl font-semibold text-foreground mb-6" data-testid="text-search-results">
            Search results for "{query}"
          </h1>
        )}

        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <VideoCardSkeleton key={i} variant="list" />
            ))}
          </div>
        ) : data?.videos && data.videos.length > 0 ? (
          <div className="space-y-6">
            {data.videos.map((video) => (
              <VideoCard key={video.id} video={video} variant="list" />
            ))}
          </div>
        ) : query ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-8 h-8 text-muted-foreground"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground">No results found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Try different keywords or check your spelling
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-8 h-8 text-muted-foreground"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground">Search for videos</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Enter a search term to find videos
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
