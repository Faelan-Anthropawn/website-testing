import type { Video, WatchHistoryItem, FavoriteItem } from "@shared/schema";

const HISTORY_KEY = "litetube_history";
const FAVORITES_KEY = "litetube_favorites";
const MAX_HISTORY_ITEMS = 100;

export function getWatchHistory(): WatchHistoryItem[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addToWatchHistory(video: Video): void {
  try {
    const history = getWatchHistory();
    const existingIndex = history.findIndex((item) => item.videoId === video.id);
    
    if (existingIndex !== -1) {
      history.splice(existingIndex, 1);
    }
    
    history.unshift({
      videoId: video.id,
      video,
      watchedAt: new Date().toISOString(),
    });
    
    if (history.length > MAX_HISTORY_ITEMS) {
      history.pop();
    }
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to add to history:", error);
  }
}

export function removeFromWatchHistory(videoId: string): void {
  try {
    const history = getWatchHistory();
    const filtered = history.filter((item) => item.videoId !== videoId);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to remove from history:", error);
  }
}

export function clearWatchHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error("Failed to clear history:", error);
  }
}

export function getFavorites(): FavoriteItem[] {
  try {
    const data = localStorage.getItem(FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addToFavorites(video: Video): void {
  try {
    const favorites = getFavorites();
    const exists = favorites.some((item) => item.videoId === video.id);
    
    if (!exists) {
      favorites.unshift({
        videoId: video.id,
        video,
        addedAt: new Date().toISOString(),
      });
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
  } catch (error) {
    console.error("Failed to add to favorites:", error);
  }
}

export function removeFromFavorites(videoId: string): void {
  try {
    const favorites = getFavorites();
    const filtered = favorites.filter((item) => item.videoId !== videoId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to remove from favorites:", error);
  }
}

export function isFavorite(videoId: string): boolean {
  const favorites = getFavorites();
  return favorites.some((item) => item.videoId === videoId);
}

export function toggleFavorite(video: Video): boolean {
  if (isFavorite(video.id)) {
    removeFromFavorites(video.id);
    return false;
  } else {
    addToFavorites(video);
    return true;
  }
}
