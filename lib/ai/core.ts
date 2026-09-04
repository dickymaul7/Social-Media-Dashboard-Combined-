export function getAIModel() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
}
