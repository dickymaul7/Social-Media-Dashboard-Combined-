import { NextResponse } from "next/server";
import { compactJson, createStructuredJson } from "@/lib/ai/core";
import {
  buildRuleBasedAnalysis,
  type PerformanceAnalysis,
  type PerformanceAnalysisInput,
} from "@/lib/social-dashboard/performance-analysis";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = {
  type: "object",
  required: ["performance_status", "executive_summary", "key_findings", "action_plan", "data_notes"],
  properties: {
    performance_status: { type: "string", enum: ["Kuat", "Cukup", "Perlu optimasi", "Data terbatas"] },
    executive_summary: { type: "string" },
    key_findings: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        required: ["title", "evidence", "meaning"],
        properties: { title: { type: "string" }, evidence: { type: "string" }, meaning: { type: "string" } },
      },
    },
    action_plan: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "object",
        required: ["priority", "timeline", "action", "rationale", "success_metric"],
        properties: {
          priority: { type: "string", enum: ["Tinggi", "Sedang", "Rendah"] },
          timeline: { type: "string" },
          action: { type: "string" },
          rationale: { type: "string" },
          success_metric: { type: "string" },
        },
      },
    },
    data_notes: { type: "array", items: { type: "string" } },
  },
};

function validInput(value: unknown): value is PerformanceAnalysisInput {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<PerformanceAnalysisInput>;
  return Boolean(
    typeof input.brand === "string" &&
      typeof input.period === "string" &&
      typeof input.posts === "number" &&
      input.totals &&
      typeof input.totals.interactions === "number" &&
      Array.isArray(input.formats) &&
      Array.isArray(input.topPosts),
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const input = body?.input;
  if (!validInput(input)) {
    return NextResponse.json({ ok: false, error: "Data performance tidak lengkap atau tidak valid." }, { status: 400 });
  }

  const fallback = buildRuleBasedAnalysis(input);
  try {
    const result = await createStructuredJson<Omit<PerformanceAnalysis, "generated_at" | "analysis_mode">>({
      schema,
      system: "Kamu adalah senior social media performance analyst untuk brand profesional/B2B Indonesia. Analisis hanya berdasarkan angka yang diberikan. Jangan mengarang tren, benchmark industri, demografi, atau penyebab yang tidak didukung data. Bedakan fakta, indikasi, dan hipotesis. Action plan harus konkret, berurutan, dapat dijalankan tim konten, dan punya success metric yang dapat diukur pada periode berikutnya.",
      user: `Analisis performa Instagram berikut dan buat action plan 30 hari. Prioritaskan kualitas interaksi (comments, saves, shares), reach, conversion proxy (profile visits/link clicks), pola format, top content, waktu tayang, dan kecukupan data. Bila suatu metrik nol atau tidak tersedia, nyatakan keterbatasannya dan jangan menyimpulkan secara berlebihan.\n\nDATA TERAGREGASI:\n${compactJson(input)}`,
      temperature: 0.2,
    });
    return NextResponse.json({
      ok: true,
      data: { ...result, generated_at: new Date().toISOString(), analysis_mode: "ai" } satisfies PerformanceAnalysis,
    });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      data: fallback,
      warning: error instanceof Error ? `Analisis AI tidak tersedia; menggunakan analisis berbasis data. ${error.message}` : "Analisis AI tidak tersedia; menggunakan analisis berbasis data.",
    });
  }
}
