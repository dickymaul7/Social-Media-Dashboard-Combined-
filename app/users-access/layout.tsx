"use client";

import PermissionGate from "@/components/permission-gate";

export default function UsersAccessLayout({children}:{children:React.ReactNode}){
  return <>{children}<PermissionGate permission="users.invite"><a href="/users-access/invite" style={invite}>＋ Invite User</a></PermissionGate></>;
}

const invite:React.CSSProperties={position:"fixed",right:24,bottom:24,zIndex:60,background:"#98142f",color:"white",padding:"12px 16px",borderRadius:999,textDecoration:"none",fontFamily:"Arial,sans-serif",fontSize:13,fontWeight:800,boxShadow:"0 10px 28px rgba(80,20,40,.22)"};
