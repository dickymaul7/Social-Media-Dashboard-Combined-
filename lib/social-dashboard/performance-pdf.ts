import {
  PDFDocument,
  PDFString,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import type { PerformanceAnalysis, PerformanceAnalysisInput } from "./performance-analysis";

const PAGE: [number, number] = [595.28, 841.89];
const MARGIN = 42;
const COLORS = {
  maroon: rgb(0.55, 0.09, 0.19),
  maroonDark: rgb(0.31, 0.04, 0.1),
  rose: rgb(0.96, 0.89, 0.91),
  blush: rgb(0.99, 0.96, 0.97),
  dark: rgb(0.13, 0.1, 0.11),
  muted: rgb(0.43, 0.39, 0.41),
  line: rgb(0.9, 0.86, 0.87),
  white: rgb(1, 1, 1),
  green: rgb(0.12, 0.42, 0.23),
  greenPale: rgb(0.91, 0.97, 0.93),
  amber: rgb(0.48, 0.34, 0.11),
  amberPale: rgb(1, 0.96, 0.86),
  red: rgb(0.62, 0.15, 0.18),
  redPale: rgb(1, 0.93, 0.93),
};

type Fonts = { regular: PDFFont; bold: PDFFont };
type LinkRect = { page: PDFPage; x: number; y: number; width: number; height: number; target: "findings" | "actions" | "content" };

function safe(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number, maxLines = 99) {
  const words = safe(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
    else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    let last = lines[maxLines - 1];
    while (last.length && font.widthOfTextAtSize(`${last}...`, size) > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}...`;
  }
  return lines.length ? lines : [""];
}

function drawLines(page: PDFPage, lines: string[], x: number, y: number, size: number, font: PDFFont, color: RGB, lineHeight = size + 4) {
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, size, font, color }));
  return lines.length * lineHeight;
}

function drawPill(page: PDFPage, fonts: Fonts, text: string, x: number, y: number, color: RGB, background: RGB, width?: number) {
  const label = safe(text).toUpperCase();
  const pillWidth = width || fonts.bold.widthOfTextAtSize(label, 7) + 18;
  page.drawRectangle({ x, y, width: pillWidth, height: 20, color: background });
  page.drawText(label, { x: x + 9, y: y + 7, size: 7, font: fonts.bold, color });
  return pillWidth;
}

function statusColors(status: PerformanceAnalysis["performance_status"]) {
  if (status === "Kuat") return { color: COLORS.green, background: COLORS.greenPale };
  if (status === "Cukup") return { color: COLORS.amber, background: COLORS.amberPale };
  return { color: COLORS.red, background: COLORS.redPale };
}

function priorityColors(priority: string) {
  if (priority === "Tinggi") return { color: COLORS.red, background: COLORS.redPale };
  if (priority === "Rendah") return { color: COLORS.green, background: COLORS.greenPale };
  return { color: COLORS.amber, background: COLORS.amberPale };
}

function addUriLink(pdf: PDFDocument, page: PDFPage, url: string, rect: [number, number, number, number]) {
  const annotation = pdf.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: rect,
    Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
  });
  page.node.addAnnot(pdf.context.register(annotation));
}

function addPageLink(pdf: PDFDocument, source: PDFPage, target: PDFPage, rect: [number, number, number, number]) {
  const annotation = pdf.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: rect,
    Border: [0, 0, 0],
    A: { Type: "Action", S: "GoTo", D: [target.ref, "Fit"] },
  });
  source.node.addAnnot(pdf.context.register(annotation));
}

function drawSectionHeader(page: PDFPage, fonts: Fonts, brand: string, section: string) {
  page.drawRectangle({ x: 0, y: PAGE[1] - 62, width: PAGE[0], height: 62, color: COLORS.maroonDark });
  page.drawText(safe(brand).toUpperCase(), { x: MARGIN, y: PAGE[1] - 25, size: 7, font: fonts.bold, color: COLORS.rose });
  page.drawText(safe(section), { x: MARGIN, y: PAGE[1] - 45, size: 14, font: fonts.bold, color: COLORS.white });
}

function drawFooter(pdf: PDFDocument, page: PDFPage, fonts: Fonts, pageNumber: number, total: number, dashboardUrl: string) {
  page.drawLine({ start: { x: MARGIN, y: 36 }, end: { x: PAGE[0] - MARGIN, y: 36 }, thickness: 0.5, color: COLORS.line });
  page.drawText("INTERACTIVE INSTAGRAM PERFORMANCE REPORT", { x: MARGIN, y: 21, size: 6.5, font: fonts.bold, color: COLORS.muted });
  const dashboardLabel = "OPEN DASHBOARD";
  const linkX = PAGE[0] / 2 - fonts.bold.widthOfTextAtSize(dashboardLabel, 6.5) / 2;
  page.drawText(dashboardLabel, { x: linkX, y: 21, size: 6.5, font: fonts.bold, color: COLORS.maroon });
  addUriLink(pdf, page, dashboardUrl, [linkX - 3, 17, linkX + fonts.bold.widthOfTextAtSize(dashboardLabel, 6.5) + 3, 31]);
  page.drawText(`${pageNumber}/${total}`, { x: PAGE[0] - MARGIN - 18, y: 21, size: 6.5, font: fonts.regular, color: COLORS.muted });
}

export async function buildPerformancePdf(
  input: PerformanceAnalysisInput,
  analysis: PerformanceAnalysis,
  dashboardUrl: string,
) {
  const pdf = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  pdf.setTitle(`${input.brand} - Instagram Content Performance`);
  pdf.setAuthor("Social Media Dashboard Combined");
  pdf.setSubject("Instagram performance analysis and 30-day action plan");

  const cover = pdf.addPage(PAGE);
  const navigation: LinkRect[] = [];
  const sections: Partial<Record<LinkRect["target"], PDFPage>> = {};
  cover.drawRectangle({ x: 0, y: 650, width: PAGE[0], height: 192, color: COLORS.maroonDark });
  cover.drawText("SOCIAL MEDIA INTELLIGENCE", { x: MARGIN, y: 805, size: 8, font: fonts.bold, color: COLORS.rose });
  cover.drawText("Instagram Content", { x: MARGIN, y: 762, size: 27, font: fonts.bold, color: COLORS.white });
  cover.drawText("Performance Report", { x: MARGIN, y: 731, size: 27, font: fonts.bold, color: COLORS.white });
  cover.drawText(safe(`${input.brand}  |  ${input.account}  |  ${input.period}`), { x: MARGIN, y: 690, size: 8.5, font: fonts.regular, color: COLORS.rose });
  const sc = statusColors(analysis.performance_status);
  drawPill(cover, fonts, analysis.performance_status, PAGE[0] - MARGIN - 96, 787, sc.color, sc.background, 96);

  const format = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
  const metrics = [
    ["TOTAL POST", format.format(input.posts)],
    ["REACH", format.format(input.totals.reach)],
    ["VIEWS", format.format(input.totals.views)],
    ["ENGAGEMENT", format.format(input.totals.interactions)],
    ["ER BY REACH", `${format.format(input.engagementRateByReach)}%`],
    ["AVG / POST", format.format(input.avgPerPost)],
  ];
  metrics.forEach(([label, value], index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = MARGIN + column * 171;
    const y = 585 - row * 76;
    cover.drawRectangle({ x, y, width: 158, height: 62, color: COLORS.white, borderColor: COLORS.line, borderWidth: 0.8 });
    cover.drawText(label, { x: x + 13, y: y + 42, size: 7, font: fonts.bold, color: COLORS.muted });
    cover.drawText(value, { x: x + 13, y: y + 16, size: 18, font: fonts.bold, color: COLORS.dark });
  });

  cover.drawRectangle({ x: MARGIN, y: 344, width: PAGE[0] - MARGIN * 2, height: 103, color: COLORS.blush, borderColor: COLORS.rose, borderWidth: 0.8 });
  cover.drawText("EXECUTIVE SUMMARY", { x: MARGIN + 16, y: 424, size: 8, font: fonts.bold, color: COLORS.maroon });
  const summary = wrap(analysis.executive_summary, fonts.regular, 9.5, PAGE[0] - MARGIN * 2 - 32, 5);
  drawLines(cover, summary, MARGIN + 16, 402, 9.5, fonts.regular, COLORS.dark, 14);

  cover.drawText("JUMP TO SECTION", { x: MARGIN, y: 310, size: 8, font: fonts.bold, color: COLORS.muted });
  const navItems: Array<{ target: LinkRect["target"]; label: string; hint: string }> = [
    { target: "findings", label: "01  Temuan Utama", hint: "Evidence & interpretation" },
    { target: "actions", label: "02  Action Plan", hint: "Prioritas 30 hari" },
    { target: "content", label: "03  Top Content", hint: "Konten & data notes" },
  ];
  navItems.forEach((item, index) => {
    const y = 253 - index * 58;
    cover.drawRectangle({ x: MARGIN, y, width: PAGE[0] - MARGIN * 2, height: 46, color: COLORS.white, borderColor: COLORS.line, borderWidth: 0.7 });
    cover.drawText(item.label, { x: MARGIN + 14, y: y + 26, size: 10, font: fonts.bold, color: COLORS.dark });
    cover.drawText(item.hint, { x: MARGIN + 14, y: y + 11, size: 7.5, font: fonts.regular, color: COLORS.muted });
    cover.drawText("OPEN >", { x: PAGE[0] - MARGIN - 48, y: y + 19, size: 7, font: fonts.bold, color: COLORS.maroon });
    navigation.push({ page: cover, x: MARGIN, y, width: PAGE[0] - MARGIN * 2, height: 46, target: item.target });
  });
  cover.drawText(`Source: ${safe(input.source)}  |  Synced: ${safe(new Date(input.syncedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }))} WIB`, { x: MARGIN, y: 51, size: 6.5, font: fonts.regular, color: COLORS.muted, maxWidth: PAGE[0] - MARGIN * 2 });

  let page = pdf.addPage(PAGE);
  sections.findings = page;
  drawSectionHeader(page, fonts, input.brand, "01  Temuan Utama");
  let y = 750;
  analysis.key_findings.forEach((finding, index) => {
    const title = wrap(finding.title, fonts.bold, 11, PAGE[0] - MARGIN * 2 - 44, 2);
    const evidence = wrap(finding.evidence, fonts.regular, 8.7, PAGE[0] - MARGIN * 2 - 44, 3);
    const meaning = wrap(finding.meaning, fonts.regular, 8.7, PAGE[0] - MARGIN * 2 - 44, 3);
    const height = 95 + title.length * 15 + evidence.length * 12.5 + meaning.length * 12.5;
    if (y - height < 58) {
      page = pdf.addPage(PAGE);
      drawSectionHeader(page, fonts, input.brand, "01  Temuan Utama (lanjutan)");
      y = 750;
    }
    page.drawRectangle({ x: MARGIN, y: y - height, width: PAGE[0] - MARGIN * 2, height, color: COLORS.white, borderColor: COLORS.line, borderWidth: 0.8 });
    page.drawRectangle({ x: MARGIN, y: y - height, width: 5, height, color: COLORS.maroon });
    drawPill(page, fonts, `INSIGHT ${String(index + 1).padStart(2, "0")}`, MARGIN + 17, y - 28, COLORS.maroon, COLORS.rose);
    let textY = y - 52;
    textY -= drawLines(page, title, MARGIN + 17, textY, 11, fonts.bold, COLORS.dark, 15);
    page.drawText("EVIDENCE", { x: MARGIN + 17, y: textY - 2, size: 6.5, font: fonts.bold, color: COLORS.maroon });
    textY -= 16;
    textY -= drawLines(page, evidence, MARGIN + 17, textY, 8.7, fonts.regular, COLORS.muted, 12.5);
    page.drawText("WHAT IT MEANS", { x: MARGIN + 17, y: textY - 1, size: 6.5, font: fonts.bold, color: COLORS.maroon });
    textY -= 15;
    drawLines(page, meaning, MARGIN + 17, textY, 8.7, fonts.regular, COLORS.dark, 12.5);
    y -= height + 12;
  });

  page = pdf.addPage(PAGE);
  sections.actions = page;
  drawSectionHeader(page, fonts, input.brand, "02  Action Plan 30 Hari");
  y = 750;
  analysis.action_plan.forEach((action, index) => {
    const actionLines = wrap(action.action, fonts.bold, 10.2, PAGE[0] - MARGIN * 2 - 36, 3);
    const rationale = wrap(action.rationale, fonts.regular, 8.5, PAGE[0] - MARGIN * 2 - 36, 3);
    const success = wrap(action.success_metric, fonts.regular, 8.5, PAGE[0] - MARGIN * 2 - 36, 3);
    const height = 100 + actionLines.length * 14 + rationale.length * 12 + success.length * 12;
    if (y - height < 58) {
      page = pdf.addPage(PAGE);
      drawSectionHeader(page, fonts, input.brand, "02  Action Plan (lanjutan)");
      y = 750;
    }
    page.drawRectangle({ x: MARGIN, y: y - height, width: PAGE[0] - MARGIN * 2, height, color: COLORS.blush, borderColor: COLORS.rose, borderWidth: 0.8 });
    const pc = priorityColors(action.priority);
    drawPill(page, fonts, action.priority, MARGIN + 15, y - 30, pc.color, pc.background);
    const timelineWidth = fonts.bold.widthOfTextAtSize(safe(action.timeline).toUpperCase(), 7) + 18;
    drawPill(page, fonts, action.timeline, PAGE[0] - MARGIN - timelineWidth - 15, y - 30, COLORS.maroon, COLORS.white, timelineWidth);
    let textY = y - 54;
    textY -= drawLines(page, actionLines, MARGIN + 15, textY, 10.2, fonts.bold, COLORS.dark, 14);
    page.drawText("WHY", { x: MARGIN + 15, y: textY - 1, size: 6.3, font: fonts.bold, color: COLORS.maroon });
    textY -= 15;
    textY -= drawLines(page, rationale, MARGIN + 15, textY, 8.5, fonts.regular, COLORS.muted, 12);
    page.drawText("SUCCESS METRIC", { x: MARGIN + 15, y: textY - 1, size: 6.3, font: fonts.bold, color: COLORS.maroon });
    textY -= 15;
    drawLines(page, success, MARGIN + 15, textY, 8.5, fonts.regular, COLORS.dark, 12);
    y -= height + 12;
  });

  page = pdf.addPage(PAGE);
  sections.content = page;
  drawSectionHeader(page, fonts, input.brand, "03  Top Content & Data Notes");
  y = 750;
  input.topPosts.slice(0, 5).forEach((post, index) => {
    const caption = wrap(post.caption || "Konten Instagram", fonts.bold, 9.5, PAGE[0] - MARGIN * 2 - 90, 2);
    const rowHeight = Math.max(62, 29 + caption.length * 14);
    page.drawRectangle({ x: MARGIN, y: y - rowHeight, width: PAGE[0] - MARGIN * 2, height: rowHeight, color: index === 0 ? COLORS.blush : COLORS.white, borderColor: COLORS.line, borderWidth: 0.7 });
    page.drawText(`#${index + 1}`, { x: MARGIN + 14, y: y - 25, size: 13, font: fonts.bold, color: index === 0 ? COLORS.maroon : COLORS.muted });
    drawLines(page, caption, MARGIN + 52, y - 21, 9.5, fonts.bold, COLORS.dark, 14);
    page.drawText(`${safe(post.type)}  |  Reach ${format.format(post.reach)}  |  Interaksi ${format.format(post.interactions)}  |  ER ${format.format(post.engagementRate)}%`, { x: MARGIN + 52, y: y - rowHeight + 13, size: 7.2, font: fonts.regular, color: COLORS.muted });
    y -= rowHeight + 8;
  });
  if (analysis.data_notes.length) {
    if (y < 210) {
      page = pdf.addPage(PAGE);
      drawSectionHeader(page, fonts, input.brand, "03  Catatan Kualitas Data");
      y = 750;
    }
    page.drawText("CATATAN KUALITAS DATA", { x: MARGIN, y: y - 10, size: 8, font: fonts.bold, color: COLORS.maroon });
    y -= 33;
    analysis.data_notes.slice(0, 8).forEach((note, index) => {
      const noteLines = wrap(note, fonts.regular, 8.5, PAGE[0] - MARGIN * 2 - 34, 3);
      page.drawRectangle({ x: MARGIN, y: y - noteLines.length * 12 - 16, width: PAGE[0] - MARGIN * 2, height: noteLines.length * 12 + 16, color: COLORS.amberPale });
      page.drawText(String(index + 1), { x: MARGIN + 10, y: y - 13, size: 7.5, font: fonts.bold, color: COLORS.amber });
      drawLines(page, noteLines, MARGIN + 28, y - 12, 8.5, fonts.regular, COLORS.dark, 12);
      y -= noteLines.length * 12 + 23;
    });
  }

  navigation.forEach((item) => {
    const target = sections[item.target];
    if (target) addPageLink(pdf, item.page, target, [item.x, item.y, item.x + item.width, item.y + item.height]);
  });
  const pages = pdf.getPages();
  pages.slice(1).forEach((current) => {
    const label = "< BACK TO SUMMARY";
    const width = fonts.bold.widthOfTextAtSize(label, 6.5);
    const x = PAGE[0] - MARGIN - width;
    current.drawText(label, { x, y: PAGE[1] - 31, size: 6.5, font: fonts.bold, color: COLORS.rose });
    addPageLink(pdf, current, cover, [x - 4, PAGE[1] - 38, x + width + 4, PAGE[1] - 20]);
  });
  pages.forEach((current, index) => drawFooter(pdf, current, fonts, index + 1, pages.length, dashboardUrl));
  return pdf.save();
}
