import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/brand/social-card.png`;
  return {
    title: "Shadowframe AI · Create Without Limits",
    description: "A focused interface for creative image and video generation powered by ComfyUI.",
    manifest: "/site.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
      other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#ff6718" }],
    },
    openGraph: {
      title: "Shadowframe AI · Create Without Limits",
      description: "Text-to-image, image-to-image, image-to-video, and text-to-video in one focused studio.",
      images: [{ url: socialImage, width: 1200, height: 630, alt: "Shadowframe AI — Create in Motion" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Shadowframe AI · Create Without Limits",
      description: "A focused image and video generation studio powered by ComfyUI.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
