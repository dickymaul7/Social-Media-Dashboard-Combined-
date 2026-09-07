"use client";

import {FormEvent,useEffect,useState} from "react";
import {useRouter} from "next/navigation";

const SESSION_KEY="proxsis-auth:session:v1";

type InviteSession={access_token:string;refresh_token?:string;expires_in?:number;token_type?:string;user?:unknown};

export default function AcceptInvitePage(){
  const router=useRouter();
  const [session,setSession]=useState<InviteSession|null>(null);
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{void (async()=>{
    try{
      const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"";
      const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"";
      if(!url||!key)throw new Error("Supabase belum dikonfigurasi.");
      const hash=new URLSearchParams(window.location.hash.replace(/^#/,""));
      const query=new URLSearchParams(window.location.search);
      const accessToken=hash.get("access_token")||query.get("access_token")||"";
      const refreshToken=hash.get("refresh_token")||query.get("refresh_token")||"";
      const expiresIn=Number(hash.get("expires_in")||query.get("expires_in")||3600);
      const type=hash.get("type")||query.get("type")||"";
      if(!accessToken)throw new Error("Invitation link tidak valid atau sudah kedaluwarsa. Minta admin mengirim invitation baru.");
      if(type&&type!=="invite"&&type!=="signup"&&type!=="recovery")throw new Error("Jenis authentication link tidak didukung.");
      const userRes=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${accessToken}`},cache:"no-store"});
      const user=await userRes.json().catch(()=>null);
      if(!userRes.ok)throw new Error(user?.msg||user?.message||"Invitation session tidak valid.");
      setSession({access_token:accessToken,refresh_token:refreshToken,expires_in:expiresIn,token_type:"bearer",user});
    }catch(e){setError(e instanceof Error?e.message:"Invitation link tidak valid.")}finally{setLoading(false)}
  })()},[]);

  async function submit(e:FormEvent){
    e.preventDefault();
    if(!session)return;
    if(password.length<8){setError("Password minimal 8 karakter.");return}
    if(password!==confirm){setError("Konfirmasi password tidak sama.");return}
    setSaving(true);setError("");
    try{
      const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"";
      const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"";
      const res=await fetch(`${url}/auth/v1/user`,{
        method:"PUT",
        headers:{apikey:key,Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},
        body:JSON.stringify({password})
      });
      const user=await res.json().catch(()=>null);
      if(!res.ok)throw new Error(user?.msg||user?.message||"Gagal menyimpan password.");
      const expiresIn=Number(session.expires_in||3600);
      localStorage.setItem(SESSION_KEY,JSON.stringify({...session,user,expires_at:Math.floor(Date.now()/1000)+expiresIn}));
      window.history.replaceState({},document.title,window.location.pathname);
      router.replace("/");
    }catch(e){setError(e instanceof Error?e.message:"Gagal menyimpan password.")}finally{setSaving(false)}
  }

  return <main style={page}><form onSubmit={submit} style={card}>
    <div style={logo}>P</div><p style={eyebrow}>PROXSIS WORKSPACE</p><h1 style={{margin:"4px 0",fontSize:28}}>Create Your Password</h1><p style={muted}>Invitation sudah diverifikasi. Buat password pribadi untuk akun workspace kamu. Admin tidak akan melihat password ini.</p>
    {loading?<p style={muted}>Verifying invitation...</p>:error&&!session?<div style={danger}>{error}</div>:<>
      <label style={label}>New Password<input style={input} type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password"/></label>
      <label style={label}>Confirm Password<input style={input} type="password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password"/></label>
      {error&&<div style={danger}>{error}</div>}
      <button style={primary} disabled={saving}>{saving?"Saving password...":"Create Password & Enter Workspace"}</button>
    </>}
  </form></main>;
}

const page:React.CSSProperties={minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#f8f5f6",fontFamily:"Arial,sans-serif",color:"#251f21"};
const card:React.CSSProperties={width:"100%",maxWidth:440,background:"white",border:"1px solid #e7dfe2",borderRadius:22,padding:28,boxShadow:"0 18px 50px rgba(60,30,40,.08)"};
const logo:React.CSSProperties={width:42,height:42,borderRadius:12,display:"grid",placeItems:"center",background:"#98142f",color:"white",fontWeight:900};
const eyebrow:React.CSSProperties={fontSize:11,fontWeight:800,letterSpacing:".14em",color:"#98142f",margin:"18px 0 5px"};
const muted:React.CSSProperties={color:"#756b70",fontSize:13,lineHeight:1.6};
const label:React.CSSProperties={display:"grid",gap:7,fontSize:12,fontWeight:700,marginTop:14};
const input:React.CSSProperties={border:"1px solid #ddd4d8",borderRadius:10,padding:"11px 12px",fontSize:14,outline:"none"};
const danger:React.CSSProperties={background:"#fff0f1",color:"#a3152d",padding:11,borderRadius:9,fontSize:12,marginTop:12};
const primary:React.CSSProperties={width:"100%",marginTop:18,border:0,borderRadius:10,padding:"12px 14px",background:"#98142f",color:"white",fontWeight:800,cursor:"pointer"};
