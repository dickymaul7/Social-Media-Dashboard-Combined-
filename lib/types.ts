export type BrandSourceFile = {
  name: string;
  notes?: string;
};

export type BrandIntelligence = {
  market_industry?: string;
  market_context?: string;
  market_trends?: string[];
  customer_segments?: string[];
  positioning?: string;
  value_proposition?: string;
  target_audiences?: string[];
  audience_pain_points?: string[];
  differentiation?: string;
  tone_of_voice?: string;
  key_messages?: string[];
  brand_pov?: string;
  core_expertise?: string[];
  proof_points?: string[];
  allowed_claims?: string[];
  prohibited_claims?: string[];
  communication_dos?: string[];
  communication_donts?: string[];
  source_files?: BrandSourceFile[];
  confidence_notes?: string[];
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
