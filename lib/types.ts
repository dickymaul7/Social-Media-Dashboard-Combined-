export type BrandIntelligence = {
  positioning?: string;
  value_proposition?: string;
  target_audiences?: string[];
  audience_pain_points?: string[];
  tone_of_voice?: string;
  key_messages?: string[];
  brand_pov?: string;
  core_expertise?: string[];
  communication_dos?: string[];
  communication_donts?: string[];
};

export type Campaign = {
  topic: string;
  objective: string;
  audience?: string;
  cta?: string;
  preferredFormat?: "auto" | "carousel" | "reels" | "single_post";
  extraContext?: string;
};

export type StoryAngle = {
  title: string;
  angle: string;
  tension: string;
  insight: string;
  format: "carousel" | "reels" | "single_post";
};
