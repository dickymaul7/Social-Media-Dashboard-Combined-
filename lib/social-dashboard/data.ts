import type { AudienceSnapshot, InstagramCompetitor, InstagramMetrics, SocialPost } from "./types";

export const defaultInstagramMetrics: InstagramMetrics = {
  period: "Last 30 days",
  updatedAt: "28 Jul 2026",
  views: 3524,
  reach: 513,
  interactions: 38,
  engaged: 17,
  profileActivity: 457,
  profileVisits: 439,
  linkTaps: 18,
  followers: 7372,
  followerViewShare: 34,
  nonFollowerViewShare: 66,
  contentViews: { stories: 68.3, reels: 25.1, posts: 6.6 },
  contentInteractions: { posts: 81.6, reels: 13.2, stories: 5.3 },
  bestTime: "Monday, 03:00 (550 active followers)",
  topContent: [
    { date: "1 Jul", views: 206, interactions: 8 },
    { date: "7 Jul", views: 182, interactions: 3 },
    { date: "2 Jul", views: 177, interactions: 5 },
    { date: "5 Jul", views: 153, interactions: 2 },
    { date: "26 Jul", views: 120, interactions: 3 },
  ],
};

export const socialPosts: SocialPost[] = [
  { id: "p1", date: "2026-08-28", type: "Carousel", title: "5 langkah membangun operating model yang siap tumbuh", reach: 820, likes: 42, comments: 8, saves: 31, shares: 14 },
  { id: "p2", date: "2026-08-25", type: "Reel", title: "Apa yang berubah saat proses bisnis dipetakan?", reach: 1280, likes: 57, comments: 11, saves: 18, shares: 22 },
  { id: "p3", date: "2026-08-22", type: "Carousel", title: "Balanced scorecard untuk keputusan direksi", reach: 910, likes: 38, comments: 9, saves: 44, shares: 17 },
  { id: "p4", date: "2026-08-19", type: "Image", title: "Proxsis Strategy insight: eksekusi tanpa silo", reach: 540, likes: 26, comments: 4, saves: 12, shares: 6 },
  { id: "p5", date: "2026-08-16", type: "Reel", title: "3 sinyal organisasi membutuhkan transformasi", reach: 1060, likes: 49, comments: 7, saves: 20, shares: 16 },
  { id: "p6", date: "2026-08-12", type: "Story", title: "Polling: tantangan terbesar tim Anda minggu ini?", reach: 390, likes: 18, comments: 3, saves: 4, shares: 2 },
];

export const socialAudience: AudienceSnapshot = {
  age: [
    { label: "18–24", value: 12 },
    { label: "25–34", value: 34 },
    { label: "35–44", value: 31 },
    { label: "45–54", value: 17 },
    { label: "55+", value: 6 },
  ],
  gender: [
    { label: "Perempuan", value: 46 },
    { label: "Laki-laki", value: 52 },
    { label: "Tidak diketahui", value: 2 },
  ],
  locations: [
    { label: "Jakarta", value: 38 },
    { label: "Surabaya", value: 14 },
    { label: "Bandung", value: 11 },
    { label: "Tangerang", value: 9 },
    { label: "Lainnya", value: 28 },
  ],
  capturedAt: "28 Jul 2026",
  source: "snapshot",
};

export const instagramCompetitors: InstagramCompetitor[] = [
  { name: "PQM Consultants", handle: "@pqmconsultants", followers: 6513, posts: 1595, positioning: "Productivity, quality, consulting, and training", contentPattern: "High-frequency training schedules, webinars, client proof, and direct registration CTAs.", url: "https://www.instagram.com/pqmconsultants/" },
  { name: "MarkPlus Institute", handle: "@markplusinstitute", followers: 30388, posts: 2090, positioning: "Training, certification, and degree programs", contentPattern: "Strong education brand, certification calendars, academy ecosystem, and program-led conversion.", url: "https://www.instagram.com/markplusinstitute/" },
  { name: "SSCX International", handle: "@sscxinternational", followers: 2869, posts: 1557, positioning: "Lean Six Sigma and operational excellence", contentPattern: "Frequent Reels, training documentation, testimonials, and technical improvement explainers.", url: "https://www.instagram.com/sscxinternational/" },
];
