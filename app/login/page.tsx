"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace("/");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login gagal.");
    } finally { setLoading(false); }
  }

  return <main className="login-page"><section className="login-card"><div className="login-mark">P</div><p className="eyebrow">PROXSIS SOCIAL MEDIA OS</p><h1>Masuk ke workspace</h1><p>Gunakan akun Supabase yang memiliki akses ke workspace. Login ini menjadi fondasi untuk fitur AI, campaign, brief, QC, dan team workflow.</p><form onSubmit={submit}><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{message&&<div className="login-error">{message}</div>}<button className="primary" disabled={loading}>{loading?"Signing in...":"Sign in"}</button></form></section></main>;
}
