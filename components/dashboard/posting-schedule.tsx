import { defaultInstagramMetrics } from "@/lib/social-dashboard/data";

export function PostingSchedule() {
  const metrics = defaultInstagramMetrics;
  return <section className="panel dashboard-module">
    <div className="feature-head"><div><p className="eyebrow">SOCIAL MEDIA INTELLIGENCE</p><h2>Posting schedule optimization</h2><p>Gunakan jam aktif audiens sebagai input jadwal, lalu validasi dengan performa aktual.</p></div><span className="feature-badge">Best window: {metrics.bestTime}</span></div>
    <div className="source-note warning">Heatmap adalah estimasi snapshot dari logic source existing; belum berasal dari hourly Instagram Insights.</div>
    <div className="schedule-grid">
      <article className="social-subcard"><h2>Active hours heatmap</h2><p className="subtle-copy">Intensitas estimasi per hari dan jam.</p><div className="heatmap">{["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map((day,row)=><div className="heat-row" key={day}><span>{day}</span><div>{Array.from({length:12},(_,i)=>{const score=(row*7+i*11+metrics.followers)%100;return <i key={i} className={score>74?"hot":score>48?"warm":"cool"} title={`${day} ${i*2}:00 · estimated`}/>})}</div></div>)}</div><div className="heat-legend"><span><i className="cool"/> Rendah</span><span><i className="warm"/> Sedang</span><span><i className="hot"/> Tinggi</span></div></article>
      <article className="social-subcard schedule-recommendation"><h2>Recommendations</h2><div className="recommendation"><span>01</span><div><strong>Prioritaskan Senin 03:00</strong><p>Window dengan follower aktif tertinggi pada snapshot terakhir.</p></div></div><div className="recommendation"><span>02</span><div><strong>Uji Reels pukul 12:00</strong><p>Bandingkan discovery dan retention dengan jam pagi.</p></div></div><div className="recommendation"><span>03</span><div><strong>Stories sebelum konten utama</strong><p>Gunakan teaser 30–60 menit sebelum carousel atau Reel.</p></div></div></article>
    </div>
  </section>;
}
