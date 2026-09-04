"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      setConfigured(false);
      setReady(true);
      return;
    }
    const supabase = createClient();
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) router.replace("/login");
      else setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
      else setReady(true);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [router]);

  if (!ready) return <div className="auth-checking">Checking session...</div>;
  if (!configured) return <>{children}</>;
  return <>{children}</>;
}
