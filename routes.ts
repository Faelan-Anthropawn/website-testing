import type { Express } from "express";
import { createServer, type Server } from "http";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

interface YouTubeSearchItem {
  id: { videoId?: string; kind: string };
  snippet: {
    title: string;
    description: string;
    thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
    channelId: string;
    channelTitle: string;
    publishedAt: string;
  };
}

interface YouTubeVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
    channelId: string;
    channelTitle: string;
    publishedAt: string;
  };
  contentDetails?: {
    duration: string;
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
  };
}

function getThumbnailUrl(thumbnails: YouTubeSearchItem["snippet"]["thumbnails"]): string {
  return thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || "";
}

function transformVideoItem(item: YouTubeVideoItem) {
  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnailUrl: getThumbnailUrl(item.snippet.thumbnails),
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    duration: item.contentDetails?.duration,
    viewCount: item.statistics?.viewCount,
    likeCount: item.statistics?.likeCount,
  };
}

function transformSearchItem(item: YouTubeSearchItem) {
  return {
    id: item.id.videoId || "",
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnailUrl: getThumbnailUrl(item.snippet.thumbnails),
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const API_KEY = process.env.YOUTUBE_API_KEY;

  if (!API_KEY) {
    console.warn("Warning: YOUTUBE_API_KEY not set. API endpoints will return mock data.");
  }

  app.get("/api/videos/trending", async (req, res) => {
    try {
      if (!API_KEY) {
        return res.json(getMockTrendingVideos());
      }

      const response = await fetch(
        `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=US&maxResults=24&key=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      const videos = data.items?.map(transformVideoItem) || [];
      res.json(videos);
    } catch (error) {
      console.error("Error fetching trending videos:", error);
      res.json(getMockTrendingVideos());
    }
  });

  app.get("/api/videos/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      if (!API_KEY) {
        return res.json({
          videos: getMockSearchResults(query),
          totalResults: 10,
        });
      }

      const searchResponse = await fetch(
        `${YOUTUBE_API_BASE}/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=20&key=${API_KEY}`
      );

      if (!searchResponse.ok) {
        throw new Error(`YouTube API error: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      const videoIds = searchData.items
        ?.filter((item: YouTubeSearchItem) => item.id.videoId)
        .map((item: YouTubeSearchItem) => item.id.videoId)
        .join(",");

      if (!videoIds) {
        return res.json({ videos: [], totalResults: 0 });
      }

      const videosResponse = await fetch(
        `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${API_KEY}`
      );

      if (!videosResponse.ok) {
        throw new Error(`YouTube API error: ${videosResponse.status}`);
      }

      const videosData = await videosResponse.json();
      const videos = videosData.items?.map(transformVideoItem) || [];

      res.json({
        videos,
        nextPageToken: searchData.nextPageToken,
        totalResults: searchData.pageInfo?.totalResults,
      });
    } catch (error) {
      console.error("Error searching videos:", error);
      const query = req.query.q as string;
      res.json({
        videos: getMockSearchResults(query),
        totalResults: 10,
      });
    }
  });

  app.get("/api/videos/:id", async (req, res) => {
    try {
      const videoId = req.params.id;

      if (!API_KEY) {
        return res.json(getMockVideo(videoId));
      }

      const response = await fetch(
        `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.items || data.items.length === 0) {
        return res.status(404).json({ error: "Video not found" });
      }

      res.json(transformVideoItem(data.items[0]));
    } catch (error) {
      console.error("Error fetching video:", error);
      res.json(getMockVideo(req.params.id));
    }
  });

  app.get("/api/videos/:id/related", async (req, res) => {
    try {
      const videoId = req.params.id;

      if (!API_KEY) {
        return res.json(getMockRelatedVideos());
      }

      const videoResponse = await fetch(
        `${YOUTUBE_API_BASE}/videos?part=snippet&id=${videoId}&key=${API_KEY}`
      );

      if (!videoResponse.ok) {
        throw new Error(`YouTube API error: ${videoResponse.status}`);
      }

      const videoData = await videoResponse.json();
      const video = videoData.items?.[0];

      if (!video) {
        return res.json([]);
      }

      const channelTitle = video.snippet.channelTitle;
      const searchResponse = await fetch(
        `${YOUTUBE_API_BASE}/search?part=snippet&type=video&q=${encodeURIComponent(channelTitle)}&maxResults=12&key=${API_KEY}`
      );

      if (!searchResponse.ok) {
        throw new Error(`YouTube API error: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      const videoIds = searchData.items
        ?.filter((item: YouTubeSearchItem) => item.id.videoId && item.id.videoId !== videoId)
        .map((item: YouTubeSearchItem) => item.id.videoId)
        .slice(0, 10)
        .join(",");

      if (!videoIds) {
        return res.json([]);
      }

      const videosResponse = await fetch(
        `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${API_KEY}`
      );

      if (!videosResponse.ok) {
        throw new Error(`YouTube API error: ${videosResponse.status}`);
      }

      const videosData = await videosResponse.json();
      const videos = videosData.items?.map(transformVideoItem) || [];

      res.json(videos);
    } catch (error) {
      console.error("Error fetching related videos:", error);
      res.json(getMockRelatedVideos());
    }
  });

  app.get("/api/channels/:id", async (req, res) => {
    try {
      const channelId = req.params.id;

      if (!API_KEY) {
        return res.json(getMockChannel(channelId));
      }

      const response = await fetch(
        `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&id=${channelId}&key=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.items || data.items.length === 0) {
        return res.status(404).json({ error: "Channel not found" });
      }

      const channel = data.items[0];
      res.json({
        id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        thumbnailUrl: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url,
        subscriberCount: channel.statistics?.subscriberCount,
        videoCount: channel.statistics?.videoCount,
      });
    } catch (error) {
      console.error("Error fetching channel:", error);
      res.json(getMockChannel(req.params.id));
    }
  });

  app.get("/api/channels/:id/videos", async (req, res) => {
    try {
      const channelId = req.params.id;

      if (!API_KEY) {
        return res.json(getMockChannelVideos());
      }

      const searchResponse = await fetch(
        `${YOUTUBE_API_BASE}/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=20&key=${API_KEY}`
      );

      if (!searchResponse.ok) {
        throw new Error(`YouTube API error: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      const videoIds = searchData.items
        ?.filter((item: YouTubeSearchItem) => item.id.videoId)
        .map((item: YouTubeSearchItem) => item.id.videoId)
        .join(",");

      if (!videoIds) {
        return res.json([]);
      }

      const videosResponse = await fetch(
        `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${API_KEY}`
      );

      if (!videosResponse.ok) {
        throw new Error(`YouTube API error: ${videosResponse.status}`);
      }

      const videosData = await videosResponse.json();
      res.json(videosData.items?.map(transformVideoItem) || []);
    } catch (error) {
      console.error("Error fetching channel videos:", error);
      res.json(getMockChannelVideos());
    }
  });

  app.get("/api/videos/:id/comments", async (req, res) => {
    try {
      const videoId = req.params.id;

      if (!API_KEY) {
        return res.json(getMockComments());
      }

      const response = await fetch(
        `${YOUTUBE_API_BASE}/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&order=relevance&key=${API_KEY}`
      );

      if (!response.ok) {
        if (response.status === 403) {
          return res.json([]);
        }
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      const comments = data.items?.map((item: any) => ({
        id: item.id,
        authorName: item.snippet.topLevelComment.snippet.authorDisplayName,
        authorProfileImage: item.snippet.topLevelComment.snippet.authorProfileImageUrl,
        text: item.snippet.topLevelComment.snippet.textDisplay,
        likeCount: item.snippet.topLevelComment.snippet.likeCount,
        publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
        replyCount: item.snippet.totalReplyCount,
      })) || [];

      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.json(getMockComments());
    }
  });

  return httpServer;
}

function getMockTrendingVideos() {
  return [
    {
      id: "dQw4w9WgXcQ",
      title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
      description: "The official video for Never Gonna Give You Up by Rick Astley",
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
      channelTitle: "Rick Astley",
      publishedAt: "2009-10-25T06:57:33Z",
      duration: "PT3M33S",
      viewCount: "1500000000",
      likeCount: "15000000",
    },
    {
      id: "jNQXAC9IVRw",
      title: "Me at the zoo",
      description: "The first video on YouTube",
      thumbnailUrl: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
      channelId: "UC4QobU6STFB0P71PMvOGN5A",
      channelTitle: "jawed",
      publishedAt: "2005-04-23T14:31:52Z",
      duration: "PT0M19S",
      viewCount: "280000000",
      likeCount: "12000000",
    },
    {
      id: "9bZkp7q19f0",
      title: "PSY - GANGNAM STYLE (Official Music Video)",
      description: "PSY - GANGNAM STYLE - Official Music Video",
      thumbnailUrl: "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg",
      channelId: "UCrDkAvwZum-UTjHmzDI2iIw",
      channelTitle: "officialpsy",
      publishedAt: "2012-07-15T07:46:32Z",
      duration: "PT4M13S",
      viewCount: "4900000000",
      likeCount: "25000000",
    },
    {
      id: "kJQP7kiw5Fk",
      title: "Luis Fonsi - Despacito ft. Daddy Yankee",
      description: "Despacito official music video",
      thumbnailUrl: "https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg",
      channelId: "UCxoq-PAQeAdk_zyg8YS0JqA",
      channelTitle: "Luis Fonsi",
      publishedAt: "2017-01-12T05:00:00Z",
      duration: "PT4M42S",
      viewCount: "8200000000",
      likeCount: "52000000",
    },
    {
      id: "RgKAFK5djSk",
      title: "Wiz Khalifa - See You Again ft. Charlie Puth",
      description: "See You Again - Official Video",
      thumbnailUrl: "https://i.ytimg.com/vi/RgKAFK5djSk/hqdefault.jpg",
      channelId: "UC3SEvBYhullC-aaEmbEwLzQ",
      channelTitle: "Wiz Khalifa",
      publishedAt: "2015-04-06T19:41:11Z",
      duration: "PT3M58S",
      viewCount: "5700000000",
      likeCount: "32000000",
    },
    {
      id: "JGwWNGJdvx8",
      title: "Ed Sheeran - Shape of You (Official Music Video)",
      description: "Shape of You official music video",
      thumbnailUrl: "https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg",
      channelId: "UC0C-w0YjGpqDXGB8IHb662A",
      channelTitle: "Ed Sheeran",
      publishedAt: "2017-01-30T05:00:06Z",
      duration: "PT4M24S",
      viewCount: "6100000000",
      likeCount: "31000000",
    },
    {
      id: "fRh_vgS2dFE",
      title: "Justin Bieber - Sorry (Official Video)",
      description: "Sorry official music video",
      thumbnailUrl: "https://i.ytimg.com/vi/fRh_vgS2dFE/hqdefault.jpg",
      channelId: "UCIwFjwMjI0y7PDBVEO9-bkQ",
      channelTitle: "Justin Bieber",
      publishedAt: "2015-10-22T13:00:00Z",
      duration: "PT3M26S",
      viewCount: "3600000000",
      likeCount: "15000000",
    },
    {
      id: "OPf0YbXqDm0",
      title: "Mark Ronson - Uptown Funk ft. Bruno Mars",
      description: "Uptown Funk official music video",
      thumbnailUrl: "https://i.ytimg.com/vi/OPf0YbXqDm0/hqdefault.jpg",
      channelId: "UCY14-R0pMrQzLne7lbTqRvA",
      channelTitle: "Mark Ronson",
      publishedAt: "2014-11-19T17:00:06Z",
      duration: "PT4M31S",
      viewCount: "4800000000",
      likeCount: "25000000",
    },
  ];
}

function getMockSearchResults(query: string) {
  const mockVideos = getMockTrendingVideos();
  return mockVideos.filter(v => 
    v.title.toLowerCase().includes(query.toLowerCase()) ||
    v.channelTitle.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10);
}

function getMockVideo(videoId: string) {
  const mockVideos = getMockTrendingVideos();
  return mockVideos.find(v => v.id === videoId) || mockVideos[0];
}

function getMockRelatedVideos() {
  return getMockTrendingVideos().slice(0, 8);
}

function getMockChannel(channelId: string) {
  return {
    id: channelId,
    title: "Sample Channel",
    description: "This is a sample channel description.",
    thumbnailUrl: "https://yt3.ggpht.com/ytc/default_avatar.png",
    subscriberCount: "1000000",
    videoCount: "100",
  };
}

function getMockChannelVideos() {
  return getMockTrendingVideos().slice(0, 10);
}

function getMockComments() {
  return [
    {
      id: "1",
      authorName: "Music Fan",
      authorProfileImage: "https://yt3.ggpht.com/ytc/default_avatar.png",
      text: "This is an amazing video! Love it!",
      likeCount: 1250,
      publishedAt: "2024-01-15T10:30:00Z",
      replyCount: 23,
    },
    {
      id: "2",
      authorName: "Video Lover",
      authorProfileImage: "https://yt3.ggpht.com/ytc/default_avatar.png",
      text: "Great content as always. Keep up the good work!",
      likeCount: 856,
      publishedAt: "2024-01-14T15:45:00Z",
      replyCount: 12,
    },
    {
      id: "3",
      authorName: "Subscriber",
      authorProfileImage: "https://yt3.ggpht.com/ytc/default_avatar.png",
      text: "Been watching this channel for years. Never disappoints!",
      likeCount: 432,
      publishedAt: "2024-01-13T08:20:00Z",
      replyCount: 5,
    },
  ];
}
