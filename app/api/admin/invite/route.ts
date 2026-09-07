import {NextRequest,NextResponse} from "next/server";

const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

async function rpc(url:string,key:string,token:string,name:string,body:Record<string,unknown>={}){
  const res=await fetch(`${url}/rest/v1/rpc/${name}`,{
    method:"POST",
    headers:{apikey:key,Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
    body:JSON.stringify(body),
    cache:"no-store"
  });
  const payload=await res.json().catch(()=>null);
  if(!res.ok)throw new Error(payload?.message||payload?.error||`RPC ${name} gagal.`);
  return payload;
}

export async function POST(req:NextRequest){
  try{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"";
    const publicKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"";
    const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
    if(!url||!publicKey) return NextResponse.json({error:"Supabase belum dikonfigurasi."},{status:500});
    if(!serviceKey) return NextResponse.json({error:"SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server."},{status:503});

    const auth=req.headers.get("authorization")||"";
    const actorToken=auth.startsWith("Bearer ")?auth.slice(7):"";
    if(!actorToken) return NextResponse.json({error:"Sesi admin tidak ditemukan."},{status:401});

    const allowed=Boolean(await rpc(url,publicKey,actorToken,"smm_has_access_permission",{p_permission_key:"users.invite"}));
    if(!allowed) return NextResponse.json({error:"Akun ini tidak memiliki permission users.invite."},{status:403});

    const body=await req.json().catch(()=>({}));
    const email=String(body?.email||"").trim().toLowerCase();
    const fullName=String(body?.full_name||"").trim();
    const roleKey=String(body?.role_key||"").trim();
    const brandIds=Array.isArray(body?.brand_ids)?body.brand_ids.map((x:unknown)=>String(x)).filter(Boolean):[];
    if(!email||!email.includes("@")) return NextResponse.json({error:"Email tidak valid."},{status:400});
    if(!roleKey) return NextResponse.json({error:"Role wajib dipilih."},{status:400});
    if(roleKey!=="super_admin"&&!brandIds.length) return NextResponse.json({error:"Pilih minimal satu Brand Access."},{status:400});

    const redirectTo=new URL("/auth/accept",req.url).toString();
    const inviteRes=await fetch(`${url}/auth/v1/invite?redirect_to=${encodeURIComponent(redirectTo)}`,{
      method:"POST",
      headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({email,data:{full_name:fullName,invited_role:roleKey}}),
      cache:"no-store"
    });
    const invited=await inviteRes.json().catch(()=>null);
    if(!inviteRes.ok){
      const message=invited?.msg||invited?.message||invited?.error_description||"Gagal mengirim invitation.";
      return NextResponse.json({error:message},{status:inviteRes.status});
    }
    const userId=String(invited?.id||invited?.user?.id||"");
    if(!userId) return NextResponse.json({error:"Invitation terkirim tetapi user id tidak diterima dari Supabase."},{status:502});

    let accessError="";
    for(const delay of [0,180,420]){
      if(delay)await sleep(delay);
      try{
        await rpc(url,publicKey,actorToken,"smm_admin_update_user_access",{
          p_target_user_id:userId,
          p_role_key:roleKey,
          p_brand_ids:roleKey==="super_admin"?[]:brandIds,
          p_overrides:[]
        });
        accessError="";
        break;
      }catch(err){accessError=err instanceof Error?err.message:"Gagal menetapkan access."}
    }

    return NextResponse.json({
      ok:true,
      user_id:userId,
      email,
      invitation_sent:true,
      access_configured:!accessError,
      warning:accessError||null
    });
  }catch(err){
    return NextResponse.json({error:err instanceof Error?err.message:"Gagal mengundang user."},{status:500});
  }
}
