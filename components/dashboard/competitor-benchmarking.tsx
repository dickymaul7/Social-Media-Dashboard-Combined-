import { Target } from "lucide-react";
import { defaultInstagramMetrics, instagramCompetitors } from "@/lib/social-dashboard/data";

const fmt = new Intl.NumberFormat("en-US");

export function CompetitorBenchmarking() {
  const metrics = defaultInstagramMetrics;
  return <section className="panel dashboard-module">
    <div className="feature-head"><div><p className="eyebrow">SOCIAL MEDIA INTELLIGENCE</p><h2>Competitor benchmarking</h2><p>Bandingkan metrik publik dan pola konten untuk menemukan ruang diferensiasi.</p></div><span className="feature-badge">{instagramCompetitors.length+1} profiles tracked</span></div>
    <div className="source-note">Relative scale adalah visual comparison follower, bukan composite performance score.</div>
    <div className="benchmark-table"><div className="benchmark-row benchmark-header"><span>Profile</span><span>Followers</span><span>Posts</span><span>Relative scale</span><span>Action</span></div><div className="benchmark-row ours"><span><strong>@proxsisconsultinggroup</strong><small>Your profile</small></span><strong>{fmt.format(metrics.followers)}</strong><strong>—</strong><div className="benchmark-bar"><i style={{width:"62%"}}/></div><span className="benchmark-tag">Own</span></div>{instagramCompetitors.map((item)=><div className="benchmark-row" key={item.handle}><span><strong>{item.handle}</strong><small>{item.name}</small></span><strong>{fmt.format(item.followers)}</strong><strong>{fmt.format(item.posts)}</strong><div className="benchmark-bar"><i style={{width:`${Math.min(100,Math.round(item.followers/Math.max(metrics.followers,item.followers)*100))}%`}}/></div><a className="benchmark-tag" href={item.url} target="_blank" rel="noreferrer">Open ↗</a></div>)}</div>
    <div className="benchmark-insight"><Target size={18}/><span><strong>Strategic gap:</strong> pertahankan authority lewat carousel berbasis framework, lalu tambah Reels untuk mengejar discovery tanpa mengorbankan kualitas lead.</span></div>
  </section>;
}
