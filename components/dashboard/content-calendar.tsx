"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { CalendarDays, ExternalLink } from "lucide-react";
import { useActiveBrand } from "@/components/active-brand";
import { loadAllBriefs, saveBrief, type BriefRecord } from "@/lib/smm-workflow";

type CalendarItem = {
  brief: BriefRecord;
  briefId: string;
  title: string;
  format: string;
  brandName: string;
  scheduledFor: string;
  humanQcStatus: "pending" | "approved";
  score: number;
  designStatus: "ready_to_design" | "designed";
  designFileUrl: string;
};

const weekdayLabels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function localDateString(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function monthTitle(date: Date) {
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(date);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function toItem(brief: BriefRecord): CalendarItem | null {
  if (!brief.scheduled_for) return null;
  return {
    brief,
    briefId: brief.id,
    title: brief.working_title || "Untitled content",
    format: brief.recommended_format || "content",
    brandName: brief.brand_name || "Brand",
    scheduledFor: brief.scheduled_for,
    humanQcStatus: brief.human_qc,
    score: Math.round(Number(brief.quality?.overall_score || 0)),
    designStatus: brief.production_status === "designed" ? "designed" : "ready_to_design",
    designFileUrl: brief.design_url || "",
  };
}

export function ContentCalendar() {
  const { activeBrand } = useActiveBrand();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickMoveDate, setQuickMoveDate] = useState("");
  const [designFileUrl, setDesignFileUrl] = useState("");
  const [designSaving, setDesignSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function loadCalendar() {
    const next = loadAllBriefs()
      .filter((brief) => brief.brand_id === activeBrand.id && Boolean(brief.scheduled_for))
      .map(toItem)
      .filter((item): item is CalendarItem => Boolean(item))
      .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
    setItems(next);
    if (selectedId && !next.some((item) => item.briefId === selectedId)) setSelectedId(null);
  }

  useEffect(() => {
    loadCalendar();
    const onStorage = () => loadCalendar();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onStorage);
    };
  }, [activeBrand.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const calendarCells = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const leading = (firstDay.getDay() + 6) % 7;
    const total = Math.ceil((leading + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, index) => {
      const dayNumber = index - leading + 1;
      if (dayNumber < 1 || dayNumber > daysInMonth) return null;
      const date = new Date(year, monthIndex, dayNumber);
      return { dateString: localDateString(date), dayNumber };
    });
  }, [month]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const current = map.get(item.scheduledFor) || [];
      current.push(item);
      map.set(item.scheduledFor, current);
    }
    return map;
  }, [items]);

  const selectedItem = items.find((item) => item.briefId === selectedId) || null;
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const monthItems = items.filter((item) => item.scheduledFor.startsWith(monthPrefix));

  function chooseItem(item: CalendarItem) {
    setSelectedId(item.briefId);
    setQuickMoveDate(item.scheduledFor);
    setDesignFileUrl(item.designFileUrl);
    setMessage("");
    setError("");
  }

  function persistBrief(nextBrief: BriefRecord) {
    saveBrief(nextBrief);
    setItems((current) => current.map((item) => item.briefId === nextBrief.id ? (toItem(nextBrief) || item) : item));
  }

  async function moveBrief(briefId: string, dateString: string) {
    const current = items.find((item) => item.briefId === briefId);
    if (!current || !dateString || current.scheduledFor === dateString) {
      setDraggingId(null);
      setDragOverDate(null);
      return;
    }
    setMovingId(briefId);
    setError("");
    setMessage("");
    try {
      const nextBrief = { ...current.brief, scheduled_for: dateString, updated_at: new Date().toISOString() };
      persistBrief(nextBrief);
      if (selectedId === briefId) setQuickMoveDate(dateString);
      setMessage(`Jadwal dipindahkan ke ${formatShortDate(dateString)}.`);
    } catch {
      setError("Gagal memindahkan jadwal.");
    } finally {
      setMovingId(null);
      setDraggingId(null);
      setDragOverDate(null);
    }
  }

  function onCardDragStart(event: DragEvent<HTMLElement>, briefId: string) {
    setDraggingId(briefId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", briefId);
  }

  function onDayDrop(event: DragEvent<HTMLElement>, dateString: string) {
    event.preventDefault();
    const briefId = event.dataTransfer.getData("text/plain") || draggingId;
    if (briefId) void moveBrief(briefId, dateString);
  }

  function setDesignStatus(item: CalendarItem, nextStatus: "ready_to_design" | "designed") {
    setDesignSaving(true);
    const nextBrief = { ...item.brief, production_status: nextStatus, updated_at: new Date().toISOString() };
    persistBrief(nextBrief);
    setMessage(nextStatus === "designed" ? "Status diubah menjadi Designed." : "Status diubah menjadi Ready to Design.");
    setDesignSaving(false);
  }

  function saveDesignFile(item: CalendarItem) {
    const value = designFileUrl.trim();
    if (value && !/^https?:\/\//i.test(value)) {
      setError("Link design harus diawali http:// atau https://");
      return;
    }
    setDesignSaving(true);
    const nextBrief = { ...item.brief, design_url: value, updated_at: new Date().toISOString() };
    persistBrief(nextBrief);
    setMessage(value ? "Link file design tersimpan." : "Link file design dihapus.");
    setDesignSaving(false);
  }

  function goPreviousMonth() { setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)); }
  function goNextMonth() { setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)); }
  function goToday() { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); }

  return <section className="panel advanced-calendar">
    <div className="calendar-toolbar">
      <div><h2>Content Calendar</h2><p>Brief yang sudah lolos Human QC dan dijadwalkan otomatis muncul di sini untuk {activeBrand.name}.</p></div>
      <div className="calendar-nav"><button className="ghost" onClick={goPreviousMonth}>← Bulan lalu</button><button className="ghost" onClick={goToday}>Hari ini</button><button className="ghost" onClick={goNextMonth}>Bulan berikut →</button></div>
    </div>
    {(message || error) && <div className="calendar-alerts">{message && <div className="calendar-success">{message}</div>}{error && <div className="calendar-error">{error}</div>}</div>}
    <div className="calendar-workspace">
      <div className="calendar-main">
        <div className="calendar-month-head"><div><h3>{monthTitle(month)}</h3><span>{monthItems.length} content terjadwal bulan ini</span></div><span className="data-note">{items.length} scheduled</span></div>
        <div className="calendar-weekdays">{weekdayLabels.map((label) => <div key={label}>{label}</div>)}</div>
        <div className="calendar-grid">{calendarCells.map((cell, index) => {
          if (!cell) return <div className="calendar-cell blank" key={`blank-${index}`} />;
          const dayItems = itemsByDate.get(cell.dateString) || [];
          const today = cell.dateString === localDateString(new Date());
          return <div key={cell.dateString} className={`calendar-cell ${dragOverDate === cell.dateString ? "drag-over" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragOverDate(cell.dateString); }} onDragLeave={() => { if (dragOverDate === cell.dateString) setDragOverDate(null); }} onDrop={(event) => onDayDrop(event, cell.dateString)}>
            <div className="calendar-day-head"><span className={today ? "today" : ""}>{cell.dayNumber}</span>{dayItems.length > 0 && <small>{dayItems.length}</small>}</div>
            <div className="calendar-day-items">{dayItems.map((item) => <article key={item.briefId} draggable onDragStart={(event) => onCardDragStart(event, item.briefId)} onDragEnd={() => { setDraggingId(null); setDragOverDate(null); }} onClick={() => chooseItem(item)} className={`calendar-card ${selectedId === item.briefId ? "selected" : ""} ${draggingId === item.briefId ? "dragging" : ""}`}>
              <div className="calendar-card-top"><span>{item.brandName}</span>{movingId === item.briefId && <small>saving...</small>}</div>
              <strong>{item.title}</strong>
              <div className="calendar-pills"><span>{item.format}</span><span className={item.humanQcStatus === "approved" ? "qc-ok" : "qc-pending"}>{item.humanQcStatus === "approved" ? "QC ✓" : "QC ulang"}</span><span className={item.designStatus === "designed" ? "designed" : "ready"}>{item.designStatus === "designed" ? "Designed ✓" : "Ready to Design"}</span>{item.designFileUrl && <span className="file-pill">File ↗</span>}</div>
            </article>)}</div>
          </div>;
        })}</div>
      </div>
      <aside className="calendar-side">
        <div className="calendar-tip"><p>DRAG & DROP</p><h3>Geser jadwal langsung di calendar.</h3><span>Tarik kartu content ke tanggal lain. Perubahan langsung tersimpan ke workflow brief.</span></div>
        <div className="calendar-detail"><h3>Quick Move</h3>{!selectedItem ? <p>Klik salah satu kartu content untuk memindahkan tanggal, mengubah design status, atau membuka Full Brief.</p> : <>
          <small>{selectedItem.brandName}</small><strong className="selected-title">{selectedItem.title}</strong><p>Saat ini: {formatShortDate(selectedItem.scheduledFor)} · AI Quality {selectedItem.score}/100</p>
          <input type="date" value={quickMoveDate} onChange={(event) => setQuickMoveDate(event.target.value)} />
          <button className="primary calendar-full-btn" onClick={() => void moveBrief(selectedItem.briefId, quickMoveDate)} disabled={!quickMoveDate || movingId === selectedItem.briefId}>{movingId === selectedItem.briefId ? "Memindahkan..." : "Pindahkan Tanggal"}</button>
          <div className="calendar-design"><div className="design-row"><div><small>DESIGN STATUS</small><b>{selectedItem.designStatus === "designed" ? "Designed ✓" : "Ready to Design"}</b></div><button className="ghost" disabled={designSaving} onClick={() => setDesignStatus(selectedItem, selectedItem.designStatus === "designed" ? "ready_to_design" : "designed")}>{selectedItem.designStatus === "designed" ? "Set Ready" : "Mark Designed"}</button></div>
          <label>LINK FILE DESIGN</label><input type="url" value={designFileUrl} onChange={(event) => setDesignFileUrl(event.target.value)} placeholder="Canva / Drive / Figma / lainnya" />
          <button className="ghost calendar-full-btn" disabled={designSaving} onClick={() => saveDesignFile(selectedItem)}>{designSaving ? "Menyimpan..." : "Simpan Link Design"}</button>
          {selectedItem.designFileUrl && <a className="calendar-design-link" href={selectedItem.designFileUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Buka File Design</a>}
          </div>
          <a className="calendar-open-brief" href={`/brief/${selectedItem.briefId}`}>Buka Full Brief →</a>
        </>}</div>
        <div className="calendar-workflow"><div><h3>Workflow</h3><span>{items.length} scheduled</span></div><p>1. Edit & urutkan slide di Full Brief.</p><p>2. Tandai <b>Lolos Human QC</b>.</p><p>3. Klik <b>Jadwalkan Brief</b>.</p><p>4. Brief otomatis masuk Calendar dan dapat digeser kapan pun.</p></div>
      </aside>
    </div>
    {!items.length && <div className="empty-feature calendar-empty"><CalendarDays size={24}/><span>Belum ada brief yang lolos QC dan dijadwalkan untuk brand ini.</span></div>}
  </section>;
}
