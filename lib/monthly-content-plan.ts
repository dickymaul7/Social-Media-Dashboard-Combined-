export type MonthlyBatchPlan={topic:string;count:number;campaignIndex:number;batchIndex:number;batchTotal:number};

export function currentLocalMonth(date=new Date()){
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
}

export function parseCampaignIdeas(value:string){
 return Array.from(new Set(value.split("\n").map(item=>item.replace(/^[-*\d.)\s]+/,"").trim()).filter(Boolean)));
}

export function buildMonthlyBatchPlan(topics:string[],total:number):MonthlyBatchPlan[]{
 if(!topics.length||total<topics.length)return[];
 const base=Math.floor(total/topics.length),remainder=total%topics.length;
 return topics.flatMap((topic,campaignIndex)=>{
  const allocation=base+(campaignIndex<remainder?1:0);
  const batchTotal=Math.ceil(allocation/10);
  return Array.from({length:batchTotal},(_,batchIndex)=>({topic,count:Math.min(10,allocation-(batchIndex*10)),campaignIndex,batchIndex:batchIndex+1,batchTotal}));
 });
}

export function scheduleMonthlyDates(month:string,total:number){
 const [year,monthNumber]=month.split("-").map(Number);
 const days=new Date(year,monthNumber,0).getDate();
 return Array.from({length:total},(_,index)=>`${month}-${String(Math.floor(index*days/total)+1).padStart(2,"0")}`);
}

export function formatPlanMonth(month:string){
 if(!/^\d{4}-\d{2}$/.test(month))return "bulan terpilih";
 const [year,monthNumber]=month.split("-").map(Number);
 return new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric"}).format(new Date(year,monthNumber-1,1));
}
