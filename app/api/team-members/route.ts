import {NextResponse} from "next/server";

export const dynamic="force-dynamic";

function bearer(request:Request){const value=request.headers.get("authorization")||"";return value.toLowerCase().startsWith("bearer ")?value.slice(7).trim():""}
function config(){return{url:process.env.NEXT_PUBLIC_SUPABASE_URL||"",anon:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"",service:process.env.SUPABASE_SERVICE_ROLE_KEY||""}}
function serviceHeaders(){const{service}=config();return{apikey:service,Authorization:`Bearer ${service}`,"Content-Type":"application/json"}}

async function validate(request:Request){
 const{url,anon}=config();const token=bearer(request);if(!url||!anon||!token)return null;
 const response=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anon,Authorization:`Bearer ${token}`},cache:"no-store"});
 if(!response.ok)return null;return response.json().catch(()=>null);
}

export async function GET(request:Request){
 const actor=await validate(request);if(!actor?.id)return NextResponse.json({ok:false,error:"Session login tidak valid."},{status:401});
 const{url,service}=config();if(!url||!service)return NextResponse.json({ok:false,error:"Team member service belum dikonfigurasi."},{status:500});
 try{
  const [memberRes,userRes]=await Promise.all([
   fetch(`${url}/rest/v1/team_members?select=id,user_id,display_name,role,active&active=eq.true&order=display_name.asc`,{headers:serviceHeaders(),cache:"no-store"}),
   fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`,{headers:serviceHeaders(),cache:"no-store"}),
  ]);
  const members=await memberRes.json().catch(()=>[]);
  const usersPayload=await userRes.json().catch(()=>({}));
  if(!memberRes.ok)return NextResponse.json({ok:false,error:members?.message||"Gagal membaca team_members."},{status:502});
  if(!userRes.ok)return NextResponse.json({ok:false,error:usersPayload?.msg||usersPayload?.message||"Gagal membaca user Auth."},{status:502});
  const authUsers=Array.isArray(usersPayload)?usersPayload:Array.isArray(usersPayload?.users)?usersPayload.users:[];
  const byId=new Map(authUsers.map((user:any)=>[String(user.id),user]));
  const result=(Array.isArray(members)?members:[]).map((member:any)=>{
   const authUser=byId.get(String(member.user_id)) as any;
   const email=String(authUser?.email||"").trim().toLowerCase();
   const metadata=authUser?.user_metadata||{};
   return {
    id:String(member.id),
    user_id:String(member.user_id),
    display_name:String(member.display_name||metadata.full_name||metadata.name||email||"Member"),
    role:String(member.role||"member"),
    email,
    active:Boolean(member.active),
   };
  }).filter((member:any)=>member.email);
  return NextResponse.json({ok:true,members:result,count:result.length});
 }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Gagal memuat member tim."},{status:500})}
}
