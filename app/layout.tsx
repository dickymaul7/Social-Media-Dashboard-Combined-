import type { Metadata } from "next";
import "./globals.css";
import "./social-dashboard.css";

export const metadata: Metadata = {
  title: "Proxsis Strategy Digital Marketing Dashboard",
  description: "Your all-in-one digital marketing performance dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
