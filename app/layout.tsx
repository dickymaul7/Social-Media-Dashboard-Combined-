import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proxsis Strategy Digital Marketing Dashboard",
  description: "Your all-in-one digital marketing performance dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <script src="/vendor/jszip.min.js" defer />
        <script src="/vendor/pdf.min.js" defer />
      </body>
    </html>
  );
}
