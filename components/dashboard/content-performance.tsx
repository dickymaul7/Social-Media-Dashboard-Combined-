"use client";

import { useMemo, useState } from "react";
import { socialPosts } from "@/lib/social-dashboard/data";

const fmt = new Intl.NumberFormat("en-US");

export function ContentPerformance() {
  const [postFilter, setPostFilter] = useState("All");
  const filteredPosts = postFilter === "All" ? socialPosts : socialPosts.filter((post) => post.type === postFilter);
  const totalEngagement = useMemo(
    () => socialPosts.reduce((sum, post) => sum + post.likes + post.comments + post.saves + post.shares, 0),
    []
  );
  const highlightedPost = socialPosts[0];

  return <section className="panel dashboard-module">
    <div className="feature-head">
      <div><p className="eyebrow">SOCIAL MEDIA INTELLIGENCE</p><h2>Content performance</h2><p>Bandingkan format, temukan post terbaik, dan gunakan data untuk mengoptimalkan kalender konten.</p></div>
      <select className="feature-select" value={postFilter} onChange={(e) => setPostFilter(e.target.value)}><option>All</option><option>Reel</option><option>Carousel</option><option>Image</option><option>Story</option></select>
    </div>
    <div className="source-note">Data source: migrated static content snapshot. Belum terhubung ke Instagram API.</div>
    <div className="content-insight-grid">
      <article className="social-subcard"><div className="panel-head"><div><h2>Format contribution</h2><p>Kontribusi pada source dashboard</p></div></div>
        {[{label:"Reels",value:42},{label:"Carousels",value:36},{label:"Images",value:14},{label:"Stories",value:8}].map((item)=><div className="progress-stat" key={item.label}><div><strong>{item.label}</strong><span>{item.value}%</span></div><div className="progress-track"><i style={{width:`${item.value}%`}}/></div></div>)}
        <div className="format-total"><strong>{totalEngagement}</strong><span>total interactions in sample</span></div>
      </article>
      <article className="social-subcard top-post-card"><div className="panel-head"><div><h2>Highlighted post</h2><p>Template post dari source existing</p></div><span className="feature-badge">Source behavior</span></div><strong>{highlightedPost.title}</strong><div className="top-post-metrics"><span><b>{highlightedPost.reach}</b> reach</span><span><b>{highlightedPost.saves}</b> saves</span><span><b>{highlightedPost.shares}</b> shares</span></div><p>Gunakan struktur carousel ini sebagai template untuk topik process improvement dan strategy execution.</p></article>
    </div>
    <div className="social-table-wrap"><table className="social-table"><thead><tr><th>Konten</th><th>Format</th><th>Reach</th><th>Engagement</th><th>ER / reach</th></tr></thead><tbody>{filteredPosts.map((post)=>{const engagement=post.likes+post.comments+post.saves+post.shares;return <tr key={post.id}><td><strong>{post.title}</strong><small>{new Date(`${post.date}T00:00:00`).toLocaleDateString("id-ID",{day:"numeric",month:"short"})}</small></td><td><span className={`content-type ${post.type.toLowerCase()}`}>{post.type}</span></td><td>{fmt.format(post.reach)}</td><td>{engagement}</td><td>{(engagement/Math.max(1,post.reach)*100).toFixed(1)}%</td></tr>})}</tbody></table></div>
  </section>;
}
