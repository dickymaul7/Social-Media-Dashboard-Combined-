import type { RoleKey } from "@/lib/access-control";

export type TeamMember={id:string;name:string;email:string;role:RoleKey;brandIds:string[];status:"active"|"inactive"};
export type TeamTask={id:string;briefId:string;assignedTo:string;status:"todo"|"in_progress"|"review"|"completed";priority:"low"|"medium"|"high";dueDate:string;updatedAt:string};
const memberKey="proxsis-smm:team-members:v1";
const taskKey="proxsis-smm:team-tasks:v1";
const defaultMembers:TeamMember[]=[{id:"owner",name:"Workspace Owner",email:"",role:"super_admin",brandIds:[],status:"active"}];
function read<T>(key:string,fallback:T):T{if(typeof window==="undefined")return fallback;try{const raw=window.localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
export function loadTeamMembers(){return read<TeamMember[]>(memberKey,defaultMembers)}
export function saveTeamMembers(rows:TeamMember[]){if(typeof window!=="undefined")window.localStorage.setItem(memberKey,JSON.stringify(rows))}
export function loadTeamTasks(){return read<TeamTask[]>(taskKey,[])}
export function saveTeamTasks(rows:TeamTask[]){if(typeof window!=="undefined")window.localStorage.setItem(taskKey,JSON.stringify(rows))}
