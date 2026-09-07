"use client";

import {useEffect,useState} from "react";
import {usePathname,useRouter} from "next/navigation";

const SESSION_KEY="proxsis-auth:session:v1";
export default function AuthGuard({children}:{children:React.ReactNode}){
 const router=useRouter();const pathname=usePathname();const [ready,setReady]=useState(false);
 useEffect(()=>{if(pathname==="/login"||pathname.startsWith("/auth/accept")){setReady(true);return}const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key){setReady(true);return}let valid=false;try{const raw=localStorage.getItem(SESSION_KEY);if(raw){const session=JSON.parse(raw);valid=Boolean(session?.access_token&&Number(session?.expires_at||0)>Date.now()/1000)}}catch{}if(!valid){router.replace(`/login?next=${encodeURIComponent(pathname)}`);return}setReady(true)},[pathname,router]);
 if(!ready)return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:"Arial,sans-serif",color:"#756b70"}}>Checking workspace access...</div>;
 return <>{children}</>;
}
