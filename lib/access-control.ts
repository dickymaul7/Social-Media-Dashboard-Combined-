export const ROLE_KEYS=["super_admin","manager","content_writer","designer","viewer"] as const;
export type RoleKey=(typeof ROLE_KEYS)[number];
export const PERMISSION_KEYS=["overview.view","brief.view","brief.create","brief.ai_generate","brief.edit","brief.improve","brief.qc","calendar.view","calendar.schedule","calendar.reschedule","design.view","design.update_status","design.update_link","brand.view","brand.edit","brand.upload","brand.create","brand.delete","analytics.view","analytics.export","users.view","users.invite","users.manage","settings.manage"] as const;
export type PermissionKey=(typeof PERMISSION_KEYS)[number];
export const DEFAULT_ROLE_PERMISSIONS:Record<RoleKey,readonly PermissionKey[]>={
  super_admin:[...PERMISSION_KEYS],
  manager:["overview.view","brief.view","brief.create","brief.ai_generate","brief.edit","brief.improve","brief.qc","calendar.view","calendar.schedule","calendar.reschedule","design.view","design.update_status","design.update_link","brand.view","brand.edit","brand.upload","brand.create","analytics.view","analytics.export"],
  content_writer:["overview.view","brief.view","brief.create","brief.ai_generate","brief.edit","brief.improve","calendar.view","design.view","brand.view"],
  designer:["overview.view","brief.view","calendar.view","design.view","design.update_status","design.update_link","brand.view"],
  viewer:["overview.view","brief.view","calendar.view","design.view","brand.view","analytics.view"],
};
export const ROLE_LABELS:Record<RoleKey,string>={super_admin:"Super Admin",manager:"Manager",content_writer:"Content Writer",designer:"Designer",viewer:"Viewer"};
