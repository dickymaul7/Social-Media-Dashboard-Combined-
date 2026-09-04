import { defaultInstagramMetrics, socialAudience } from "@/lib/social-dashboard/data";

const fmt = new Intl.NumberFormat("en-US");

export function AudienceAnalytics() {
  const metrics = defaultInstagramMetrics;
  return <section className="panel dashboard-module">
    <div className="feature-head"><div><p className="eyebrow">SOCIAL MEDIA INTELLIGENCE</p><h2>Audience analytics</h2><p>Pahami profil audiens, lokasi utama, dan peluang distribusi konten.</p></div><span className="feature-badge">Snapshot {socialAudience.capturedAt}</span></div>
    <div className="source-note">Data source: audience snapshot ({socialAudience.source}). Bukan live Instagram Insights.</div>
    <div className="audience-summary"><div><span>Total followers</span><strong>{fmt.format(metrics.followers)}</strong></div><div><span>Top age</span><strong>25–34</strong></div><div><span>Top location</span><strong>Jakarta</strong></div><div><span>Active window</span><strong>Senin · 03:00</strong></div></div>
    <div className="audience-grid">
      <article className="social-subcard"><div className="panel-head"><div><h2>Age distribution</h2><p>Persentase follower</p></div></div>{socialAudience.age.map((item)=><div className="progress-stat" key={item.label}><div><strong>{item.label}</strong><span>{item.value}%</span></div><div className="progress-track"><i style={{width:`${item.value}%`}}/></div></div>)}</article>
      <article className="social-subcard"><div className="panel-head"><div><h2>Gender split</h2><p>Distribusi audiens</p></div></div><div className="gender-donut"><div><strong>52%</strong><span>Laki-laki</span></div></div><div className="gender-legend"><span><i className="male"/> Laki-laki</span><span><i className="female"/> Perempuan</span></div></article>
      <article className="social-subcard"><div className="panel-head"><div><h2>Top locations</h2><p>Kota dengan audiens terbesar</p></div></div>{socialAudience.locations.map((item)=><div className="location-row" key={item.label}><span>{item.label}</span><div className="progress-track"><i style={{width:`${item.value}%`}}/></div><strong>{item.value}%</strong></div>)}</article>
    </div>
  </section>;
}
