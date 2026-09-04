import type { BrandIntelligence } from "./types";

export function buildBrandContext(intelligence?: BrandIntelligence | null) {
  if (!intelligence) return "Belum ada Brand Intelligence tersimpan.";
  return [
    intelligence.positioning && `Positioning: ${intelligence.positioning}`,
    intelligence.value_proposition && `Value proposition: ${intelligence.value_proposition}`,
    intelligence.target_audiences?.length && `Target audience: ${intelligence.target_audiences.join(", ")}`,
    intelligence.audience_pain_points?.length && `Audience pain points: ${intelligence.audience_pain_points.join("; ")}`,
    intelligence.tone_of_voice && `Tone of voice: ${intelligence.tone_of_voice}`,
    intelligence.key_messages?.length && `Key messages: ${intelligence.key_messages.join("; ")}`,
    intelligence.brand_pov && `Brand POV: ${intelligence.brand_pov}`,
    intelligence.core_expertise?.length && `Core expertise: ${intelligence.core_expertise.join(", ")}`,
    intelligence.communication_dos?.length && `Do: ${intelligence.communication_dos.join("; ")}`,
    intelligence.communication_donts?.length && `Don't: ${intelligence.communication_donts.join("; ")}`,
  ].filter(Boolean).join("\n");
}

export function resolveAudience(input: string | undefined, intelligence?: BrandIntelligence | null) {
  const value = input?.trim();
  if (value) return value;
  return intelligence?.target_audiences?.filter(Boolean).join(", ") || "";
}
