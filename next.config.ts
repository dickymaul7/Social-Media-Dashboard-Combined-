import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs resolves its worker from the installed package at runtime. Bundling it
  // into a Next.js server chunk makes the relative `./pdf.worker.js` lookup fail
  // in Vercel Functions.
  serverExternalPackages: ["pdfjs-dist"],
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
