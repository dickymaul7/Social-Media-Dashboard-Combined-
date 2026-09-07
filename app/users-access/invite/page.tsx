"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import AuthGuard from "@/components/auth-guard";
import PermissionGate from "@/components/permission-gate";
import {readSession,rpc} from "@/lib/access-control";

type Role={key:string;name:string};
type Brand={id:string;name:string};
type Snapshot={roles:Role[];brands:Brand[];can_manage:boolean};

export default function InviteUserPage(){
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
  const [email,setEmail]=useState("");
  const [fullName,setFullName]=useState("");
  const [role,setRole]=useState("viewer");
  const [brandIds,setBrandIds]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [warning,setWarning]=useState("");

  useEffect(()=>{void (async()=>{try{const snap=await rpc<Snapshot>("smm_admin_access_snapshot");setSnapshot(snap);const defaultRole=snap.roles.find(r=>r.key==="viewer")?.key||snap.roles[0]?.key||"viewer";setRole(defaultRole)}catch(e){setError(e instanceof Error?e.message:"Gagal memuat role dan brand.")}finally{setLoading(false)}})()},[]);
  const selectedRole=useMemo(()=>snapshot?.roles.find(r=>r.key===role)||null,[snapshot,role]);
  const isAdmin=role==="super_admin";
  function toggleBrand(id:string){setBrandIds(cur=>cur.includes(id)?cur.filter(x=>x!==id):[...cur,id])}

  async function submit(e:FormEvent){
    e.preventDefault();
    if(!isAdmin&&!brandIds.length){setError("Pilih minimal satu Brand Access.");return}
    setSending(true);setError("");setSuccess("");setWarning("");
    try{
      const session=readSession();
      if(!session?.access_token)throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");
      const res=await fetch("/api/admin/invite",{
        method:"POST",
        headers:{Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},
        body:JSON.stringify({email,full_name:fullName,role_key:role,brand_ids:isAdmin?[]:brandIds})
      });
      const payload=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(payload?.error||"Gagal mengirim invitation.");
      setSuccess(`Invitation berhasil dikirim ke ${email}. User akan membuat password sendiri dari email tersebut.`);
      if(payload?.warning)setWarning(`Invitation terkirim, tetapi access belum berhasil dipasang otomatis: ${payload.warning}. Setelah user muncul di Users & Access, simpan access secara manual.`);
      setEmail("");setFullName("");setBrandIds([]);
    }catch(e){setError(e instanceof Error?e.message:"Gagal mengirim invitation.")}finally{setSending(false)}
  }

  return <AuthGuard><PermissionGate permission="users.invite"><main style={page}>
    <header style={head}><div><a href="/users-access" style={back}>← Users & Access</a><p style={eyebrow}>SETTINGS · USER INVITATION</p><h1 style={{margin:"4px 0",fontSize:30}}>Invite User</h1><p style={muted}>Kirim invitation dari dashboard. User menentukan password sendiri melalui email, lalu role dan Brand Access langsung mengikuti konfigurasi ini.</p></div></header>
    {error&&<div style={danger}>{error}</div>}{success&&<div style={good}>{success}</div>}{warning&&<div style={warn}>{warning}</div>}
    <form onSubmit={submit} style={{...card,maxWidth:760,marginTop:18}}>
      {loading?<p style={muted}>Loading roles & brands...</p>:<>
        <div style={grid2}><label style={label}>Full Name<input style={input} value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Nama user"/></label><label style={label}>Email<input style={input} type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"/></label></div>
        <label style={label}>Role<select style={input} value={role} onChange={e=>{setRole(e.target.value);setBrandIds([])}}>{snapshot?.roles.map(r=><option key={r.key} value={r.key}>{r.name}</option>)}</select></label>
        <section style={section}><b>Brand Access</b>{isAdmin?<p style={note}>Super Admin otomatis memiliki akses ke seluruh brand.</p>:<div style={brandGrid}>{snapshot?.brands.map(b=><label key={b.id} style={check}><input type="checkbox" checked={brandIds.includes(b.id)} onChange={()=>toggleBrand(b.id)}/><span>{b.name}</span></label>)}</div>}</section>
        <div style={summary}><b>Invitation summary</b><span>{email||"Email belum diisi"}</span><span>{selectedRole?.name||role}</span><span>{isAdmin?"All brands":`${brandIds.length} brand dipilih`}</span></div>
        <button style={primary} disabled={sending||!email}>{sending?"Sending invitation...":"Send Invitation"}</button>
      </>}
    </form>
  </main></PermissionGate></AuthGuard>;
}

const page:React.CSSProperties={maxWidth:1080,margin:"0 auto",padding:"28px 24px 60px",fontFamily:"Arial,sans-serif",color:"#251f21"};
const head:React.CSSProperties={borderBottom:"1px solid #e7dfe2",paddingBottom:18};
const back:React.CSSProperties={fontSize:12,color:"#6c303d",fontWeight:700,textDecoration:"none"};
const eyebrow:React.CSSProperties={fontSize:10,fontWeight:800,letterSpacing:".13em",color:"#98142f",margin:"12px 0 0"};
const muted:React.CSSProperties={fontSize:13,color:"#756b70",lineHeight:1.6,maxWidth:760};
const card:React.CSSProperties={background:"white",border:"1px solid #e5dfe2",borderRadius:16,padding:20,boxShadow:"0 6px 20px rgba(44,27,33,.04)"};
const grid2:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:14};
const label:React.CSSProperties={display:"grid",gap:7,fontSize:12,fontWeight:700,marginTop:14};
const input:React.CSSProperties={border:"1px solid #ddd5d8",borderRadius:9,padding:"11px 12px",background:"white",width:"100%",fontSize:14};
const section:React.CSSProperties={borderTop:"1px solid #eee8ea",marginTop:20,paddingTop:18};
const brandGrid:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,marginTop:10};
const check:React.CSSProperties={display:"flex",gap:8,alignItems:"center",border:"1px solid #eee8ea",borderRadius:9,padding:10,fontSize:12};
const note:React.CSSProperties={padding:10,borderRadius:9,background:"#f6f2f3",color:"#6f6267",fontSize:12};
const summary:React.CSSProperties={display:"grid",gap:4,marginTop:18,padding:14,borderRadius:12,background:"#faf7f8",fontSize:12,color:"#6f6267"};
const primary:React.CSSProperties={border:0,background:"#98142f",color:"white",borderRadius:9,padding:"12px 16px",fontWeight:800,cursor:"pointer",marginTop:18};
const good:React.CSSProperties={marginTop:14,padding:12,borderRadius:9,background:"#eef8f1",color:"#267347"};
const warn:React.CSSProperties={marginTop:14,padding:12,borderRadius:9,background:"#fff7e8",color:"#855d14"};
const danger:React.CSSProperties={marginTop:14,padding:12,borderRadius:9,background:"#fff0f1",color:"#a3152d"};
