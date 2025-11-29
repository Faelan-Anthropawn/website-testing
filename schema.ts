import { z } from "zod";

export const videoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  thumbnailUrl: z.string(),
  channelId: z.string(),
  channelTitle: z.string(),
  channelThumbnail: z.string().optional(),
  publishedAt: z.string(),
  viewCount: z.string().optional(),
  likeCount: z.string().optional(),
  duration: z.string().optional(),
});

export const channelSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  thumbnailUrl: z.string(),
  subscriberCount: z.string().optional(),
  videoCount: z.string().optional(),
});

export const searchResultSchema = z.object({
  videos: z.array(videoSchema),
  nextPageToken: z.string().optional(),
  totalResults: z.number().optional(),
});

export const commentSchema = z.object({
  id: z.string(),
  authorName: z.string(),
  authorProfileImage: z.string(),
  text: z.string(),
  likeCount: z.number(),
  publishedAt: z.string(),
  replyCount: z.number().optional(),
});

export type Video = z.infer<typeof videoSchema>;
export type Channel = z.infer<typeof channelSchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;
export type Comment = z.infer<typeof commentSchema>;

export interface WatchHistoryItem {
  videoId: string;
  video: Video;
  watchedAt: string;
}

export interface FavoriteItem {
  videoId: string;
  video: Video;
  addedAt: string;
}
