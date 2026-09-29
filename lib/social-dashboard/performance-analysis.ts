export type PerformanceAnalysisInput = {
  brand: string;
  account: string;
  period: string;
  source: string;
  syncedAt: string;
  posts: number;
  followers: number;
  totals: {
    reach: number;
    impressions: number;
    views: number;
    interactions: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    profileVisits: number;
    linkClicks: number;
  };
  avgPerPost: number;
  engagementRateByReach: number;
  engagementPer100Followers: number;
  postsPerWeek: number;
  videoShare: number;
  formats: Array<{ type: string; posts: number; engagement: number; average: number }>;
  topPosts: Array<{
    caption: string;
    type: string;
    reach: number;
    interactions: number;
    engagementRate: number;
  }>;
  bestHours: Array<{ hour: number; posts: number; average: number }>;
  bestDays: Array<{ day: string; posts: number; average: number }>;
  hashtags: Array<{ tag: string; used: number; average: number }>;
  warnings: string[];
};

export type PerformanceAnalysis = {
  performance_status: "Kuat" | "Cukup" | "Perlu optimasi" | "Data terbatas";
  executive_summary: string;
  key_findings: Array<{ title: string; evidence: string; meaning: string }>;
  action_plan: Array<{
    priority: "Tinggi" | "Sedang" | "Rendah";
    timeline: string;
    action: string;
    rationale: string;
    success_metric: string;
  }>;
  data_notes: string[];
  generated_at: string;
  analysis_mode: "ai" | "rules";
};

const number = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

export function buildRuleBasedAnalysis(input: PerformanceAnalysisInput): PerformanceAnalysis {
  const hasCoreData = input.posts > 0 && (input.totals.interactions > 0 || input.totals.reach > 0 || input.totals.views > 0);
  const status: PerformanceAnalysis["performance_status"] = !hasCoreData
    ? "Data terbatas"
    : input.engagementRateByReach >= 5
      ? "Kuat"
      : input.engagementRateByReach >= 2
        ? "Cukup"
        : "Perlu optimasi";
  const topFormat = input.formats[0];
  const topPost = input.topPosts[0];
  const bestHour = [...input.bestHours].sort((a, b) => b.average - a.average)[0];
  const bestDay = [...input.bestDays].sort((a, b) => b.average - a.average)[0];
  const topHashtag = input.hashtags[0];
  const findings: PerformanceAnalysis["key_findings"] = [];

  findings.push({
    title: "Skala performa periode aktif",
    evidence: `${number.format(input.posts)} konten menghasilkan ${number.format(input.totals.reach)} reach dan ${number.format(input.totals.interactions)} interaksi.`,
    meaning: input.totals.reach > 0
      ? `Engagement rate berbasis reach berada di ${number.format(input.engagementRateByReach)}%.`
      : "Reach belum tersedia, sehingga efisiensi engagement terhadap jangkauan belum dapat dinilai.",
  });
  if (topFormat) findings.push({
    title: `${topFormat.type} menjadi format terkuat`,
    evidence: `${number.format(topFormat.engagement)} total engagement dari ${number.format(topFormat.posts)} konten; rata-rata ${number.format(topFormat.average)} per konten.`,
    meaning: "Format ini layak diprioritaskan sebagai pola utama, sambil tetap diuji terhadap format alternatif.",
  });
  if (topPost) findings.push({
    title: "Top content memberi pola yang dapat direplikasi",
    evidence: `${topPost.caption.slice(0, 90)} menghasilkan ${number.format(topPost.interactions)} interaksi dan ${number.format(topPost.engagementRate)}% ER.`,
    meaning: "Angle, hook, struktur, dan CTA konten teratas dapat dijadikan hipotesis untuk konten berikutnya.",
  });
  if (bestDay || bestHour) findings.push({
    title: "Ada indikasi waktu publikasi terbaik",
    evidence: `${bestDay ? `Hari ${bestDay.day}` : "Hari belum tersedia"}${bestHour ? ` dan sekitar ${String(bestHour.hour).padStart(2, "0")}:00 WIB` : ""} mencatat rata-rata engagement tertinggi pada sampel.`,
    meaning: "Gunakan waktu tersebut sebagai slot uji, bukan kesimpulan mutlak, sampai jumlah sampel bertambah.",
  });

  const actions: PerformanceAnalysis["action_plan"] = [
    {
      priority: "Tinggi",
      timeline: "7 hari",
      action: topPost
        ? `Buat 2 konten turunan dari pola top content "${topPost.caption.slice(0, 70)}" dengan hook dan CTA yang berbeda.`
        : "Publikasikan minimal 2 konten dengan tujuan dan CTA yang terukur.",
      rationale: "Memvalidasi apakah pola konten terbaik dapat menghasilkan performa yang konsisten, bukan hanya satu kali lonjakan.",
      success_metric: `Rata-rata interaksi per konten minimal ${number.format(Math.max(1, input.avgPerPost))} dan saves/shares meningkat dari baseline periode ini.`,
    },
    {
      priority: "Tinggi",
      timeline: "14 hari",
      action: topFormat
        ? `Alokasikan sekitar 60% produksi ke format ${topFormat.type}, lalu gunakan 40% untuk menguji satu format pembanding.`
        : "Uji dua format konten dengan topik dan CTA yang sebanding.",
      rationale: "Menambah volume pada format yang telah menunjukkan sinyal performa sambil menjaga ruang eksperimen.",
      success_metric: "Format utama mempertahankan atau meningkatkan rata-rata engagement per post dibanding baseline.",
    },
    {
      priority: "Sedang",
      timeline: "14-21 hari",
      action: bestDay || bestHour
        ? `Jadwalkan minimal 3 eksperimen pada ${bestDay ? `hari ${bestDay.day}` : "hari terbaik"}${bestHour ? ` sekitar ${String(bestHour.hour).padStart(2, "0")}:00 WIB` : ""}.`
        : "Catat jam dan hari publikasi setiap konten agar waktu tayang terbaik dapat dianalisis.",
      rationale: "Mengonfirmasi pengaruh waktu tayang dengan sampel tambahan yang terkontrol.",
      success_metric: "Bandingkan rata-rata reach dan engagement slot uji dengan rata-rata periode aktif.",
    },
    {
      priority: "Sedang",
      timeline: "30 hari",
      action: topHashtag
        ? `Pertahankan ${topHashtag.tag} pada konten relevan dan uji 2-3 hashtag tematik baru; jangan mengubah semuanya sekaligus.`
        : "Bangun kelompok hashtag tematik dan gunakan secara konsisten agar efektivitasnya dapat dibandingkan.",
      rationale: "Pengujian bertahap membuat kontribusi hashtag lebih mudah dievaluasi.",
      success_metric: "Review reach, saves, shares, profile visits, dan link clicks pada akhir periode berikutnya.",
    },
  ];

  const notes = [...input.warnings];
  if (!input.totals.reach) notes.push("Reach tidak tersedia; engagement rate berbasis reach belum dapat menjadi acuan.");
  if (!input.followers) notes.push("Jumlah followers tidak tersedia; rasio engagement terhadap followers belum dapat diverifikasi.");
  if (!input.bestHours.length) notes.push("Timestamp/jam publikasi tidak tersedia untuk analisis waktu tayang.");
  if (input.posts < 5) notes.push("Jumlah konten kurang dari 5; rekomendasi masih bersifat indikatif.");

  return {
    performance_status: status,
    executive_summary: hasCoreData
      ? `${input.brand} mencatat ${number.format(input.totals.interactions)} interaksi dari ${number.format(input.posts)} konten pada periode ${input.period}. Fokus berikutnya adalah mereplikasi pola konten terbaik, menguji format secara terkontrol, dan menghubungkan engagement ke aksi bernilai seperti profile visit serta link click.`
      : `Data ${input.brand} pada periode ${input.period} belum cukup untuk menyimpulkan performa. Lengkapi metrik reach, engagement, dan detail konten agar action plan dapat dipertajam.`,
    key_findings: findings,
    action_plan: actions,
    data_notes: [...new Set(notes)],
    generated_at: new Date().toISOString(),
    analysis_mode: "rules",
  };
}
