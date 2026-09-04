export type SocialPost = {
  id: string;
  date: string;
  type: "Reel" | "Carousel" | "Image" | "Story";
  title: string;
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
};

export type AudienceSegment = { label: string; value: number };

export type AudienceSnapshot = {
  age: AudienceSegment[];
  gender: AudienceSegment[];
  locations: AudienceSegment[];
  capturedAt: string;
  source: "snapshot" | "manual" | "instagram_insights";
};

export type InstagramMetrics = {
  period: string;
  updatedAt: string;
  views: number;
  reach: number;
  interactions: number;
  engaged: number;
  profileActivity: number;
  profileVisits: number;
  linkTaps: number;
  followers: number;
  followerViewShare: number;
  nonFollowerViewShare: number;
  contentViews: { stories: number; reels: number; posts: number };
  contentInteractions: { posts: number; reels: number; stories: number };
  bestTime: string;
  topContent: Array<{ date: string; views: number; interactions: number }>;
};

export type InstagramCompetitor = {
  name: string;
  handle: string;
  followers: number;
  posts: number;
  positioning: string;
  contentPattern: string;
  url: string;
};
