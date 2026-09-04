import type { Metadata } from "next";
import { ActiveBrandProvider } from "@/components/active-brand";
import { BrandIntelligenceProvider } from "@/components/brand-intelligence-context";
import "./globals.css";
import "./social-dashboard.css";
import "./brand-intelligence.css";
import "./auth.css";
import "./production-calendar.css";
import "./team-access.css";

export const metadata: Metadata = { title: "Proxsis Strategy Digital Marketing Dashboard", description: "Your all-in-one digital marketing performance dashboard" };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body><ActiveBrandProvider><BrandIntelligenceProvider>{children}</BrandIntelligenceProvider></ActiveBrandProvider></body></html>}
