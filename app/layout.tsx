import type {Metadata} from "next";
import {ActiveBrandProvider} from "@/components/active-brand";
import {BrandIntelligenceProvider} from "@/components/brand-intelligence-context";
import AuthGuard from "@/components/auth-guard";
import BrandAlignmentWidget from "@/components/brand-alignment-widget";
import TaskAssignmentWidget from "@/components/task-assignment-widget";
import WorkspaceHydrator from "@/components/workspace-hydrator";
import SharedContentHydrator from "@/components/shared-content-hydrator";
import BufferInstagramPublisher from "@/components/buffer-instagram-publisher";
import CalendarLegacyDesignLinkHider from "@/components/calendar-legacy-design-link-hider";
import CalendarTaskAssignment from "@/components/calendar-task-assignment";
import "./globals.css";import "./social-dashboard.css";import "./brand-intelligence.css";import "./calendar-channels.css";
export const metadata:Metadata={title:"Proxsis Strategy Digital Marketing Dashboard",description:"Your all-in-one digital marketing performance dashboard"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><ActiveBrandProvider><BrandIntelligenceProvider><AuthGuard><WorkspaceHydrator/><SharedContentHydrator/>{children}<BrandAlignmentWidget/><TaskAssignmentWidget/><BufferInstagramPublisher/><CalendarTaskAssignment/><CalendarLegacyDesignLinkHider/></AuthGuard></BrandIntelligenceProvider></ActiveBrandProvider></body></html>}