"use client";

import {useEffect,useState} from "react";
import {usePathname,useRouter} from "next/navigation";

export default function AuthGuard({children}:{children:React.ReactNode}){
 const router=useRouter();const pathname=usePathname();const [ready,setReady]=useState(false);
 useEffect(()=>{const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key){setReady(true);return}const storageKey=Object.keys(localStorage).find(k=>k.startsWith("sb-")&&k.endsWith("-auth-token"));if(!storageKey){if(pathname!=="/login")router.replace(`/login?next=${encodeURIComponent(pathname)}`);return}setReady(true)},[pathname,router]);
 if(!ready)return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:"Arial,sans-serif",color:"#756b70"}}>Checking workspace access...</div>;
 return <>{children}</>;
}
