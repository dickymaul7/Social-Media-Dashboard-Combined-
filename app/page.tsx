"use client";

import { useMemo, useState } from "react";
import {
  BarChart3, CalendarDays, ChevronDown, FileText, Gauge, Instagram, Sparkles,
  LayoutDashboard, Megaphone, Menu, Search, Settings, Users, X
} from "lucide-react";

type Section = "Overview" | "Content Performance" | "Audience Analytics" | "Posting Schedule" | "Competitor Benchmarking" | "Content Calendar" | "Workspace Hub" | "Reports" | "Content Generator";

const sections: {name:Section; icon:React.ReactNode}[] = [
  {name:"Overview",icon:<LayoutDashboard size={18}/>},
  {name:"Content Performance",icon:<BarChart3 size={18}/>},
  {name:"Audience Analytics",icon:<Users size={18}/>},
  {name:"Posting Schedule",icon:<CalendarDays size={18}/>},
  {name:"Competitor Benchmarking",icon:<Gauge size={18}/>},
  {name:"Content Calendar",icon:<CalendarDays size={18}/>},
  {name:"Workspace Hub",icon:<Megaphone size={18}/>},
  {name:"Reports",icon:<FileText size={18}/>},
  {name:"Content Generator",icon:<Sparkles size={18}/>},

];

export default function Home() {
  const [active,setActive]=useState<Section>("Overview");
  const [open,setOpen]=useState(false);
  const [brand,setBrand]=useState("Proxsis Consulting Group");
  const [period,setPeriod]=useState("Last 30 Days");
  const cards=useMemo(()=>[
    ["Total Views","1.24M","+18.4%"],
    ["Accounts Reached","382.6K","+12.7%"],
    ["Interactions","21.8K","+9.3%"],
    ["Profile Visits","14.2K","+7.8%"],
  ],[]);

  return <main className="app-shell">
    <aside className={open?"sidebar open":"sidebar"}>
      <div className="brand-row"><div className="brand-mark">P</div><div><b>Proxsis Strategy</b><span>Social Media Dashboard</span></div><button className="close-mobile" onClick={()=>setOpen(false)}><X size={18}/></button></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{sections.map(s=><button key={s.name} className={active===s.name?"nav-item active":"nav-item"} onClick={()=>{setActive(s.name);setOpen(false)}}>{s.icon}<span>{s.name}</span></button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item"><Settings size={18}/><span>Settings</span></button></div>
    </aside>
    <section className="content">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setOpen(true)}><Menu size={20}/></button><div className="search"><Search size={17}/><input placeholder="Search dashboard..." /></div><div className="top-actions"><select value={brand} onChange={e=>setBrand(e.target.value)}><option>Proxsis Consulting Group</option><option>Proxsis Strategy</option><option>Proxsis Infra</option></select><button className="avatar">DS</button></div></header>
      <div className="page">
        <div className="page-head"><div><p className="eyebrow">SOCIAL MEDIA INTELLIGENCE</p><h1>{active}</h1><p className="muted">Monitor performance, identify opportunities, and turn insights into action.</p></div><select className="period" value={period} onChange={e=>setPeriod(e.target.value)}><option>Last 30 Days</option><option>Last 7 Days</option><option>Last 90 Days</option></select></div>
        {active==="Content Generator" ? <section className="panel empty-panel"><div className="empty-icon"><Sparkles size={22}/></div><h2>Content Generator</h2><p>Brand Intelligence-powered content strategy will be connected here. Open the dedicated workspace to generate case-led story angles and briefs.</p><a className="primary" href="/content-generator">Open Content Generator</a></section> : active==="Overview" ? <><div className="metric-grid">{cards.map(c=><div className="metric" key={c[0]}><span>{c[0]}</span><strong>{c[1]}</strong><em>{c[2]}</em></div>)}</div>
          <div className="grid-two"><section className="panel"><div className="panel-head"><div><h2>Performance Overview</h2><p>Views and reach trend</p></div><button className="ghost">View details</button></div><div className="chart"><div className="bars">{[42,55,48,72,64,81,76,94,68,86,79,100].map((h,i)=><div key={i} className="bar" style={{height:h+"%"}}><span/></div>)}</div><div className="axis"><span>W1</span><span>W2</span><span>W3</span><span>W4</span></div></div></section>
          <section className="panel"><div className="panel-head"><div><h2>Content Mix</h2><p>Contribution by format</p></div></div><div className="mix"><div className="donut"><div><b>1,240K</b><span>views</span></div></div><div className="legend"><div><i className="dot one"/>Reels <b>52%</b></div><div><i className="dot two"/>Carousels <b>31%</b></div><div><i className="dot three"/>Stories <b>17%</b></div></div></div></section></div>
          <div className="grid-two"><section className="panel"><div className="panel-head"><div><h2>Top Content</h2><p>Best-performing posts this period</p></div></div><div className="rows">{["Leadership in AI Era","ISO 9001: What Changes","GRC in One Framework"].map((x,i)=><div className="row" key={x}><span className="rank">{i+1}</span><div><b>{x}</b><small>{["Carousel","Reels","Single Post"][i]}</small></div><strong>{["8.4%","7.1%","6.2%"][i]}</strong></div>)}</div></section>
          <section className="panel"><div className="panel-head"><div><h2>Quick Actions</h2><p>Continue your social media workflow</p></div></div><div className="quick-grid"><button onClick={()=>setActive("Content Calendar")}><CalendarDays/><span>Open Calendar</span></button><button><Instagram/><span>Instagram Analytics</span></button><button><FileText/><span>Generate Report</span></button><button><Users/><span>Team Workspace</span></button></div></section></div>
        </> : <section className="panel empty-panel"><div className="empty-icon">{sections.find(s=>s.name===active)?.icon}</div><h2>{active}</h2><p>This migrated workspace is ready for the next integration stage. The existing dashboard modules will be connected here without modifying SMM-Simplified.</p><button className="primary">Continue migration</button></section>}
      </div>
    </section>
  </main>
}
