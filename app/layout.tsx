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
  const socialImage = `${protocol}://${host}/og.png`;
  return {
    title: "Shadowframe AI · Create Without Limits",
    description: "A focused interface for creative image and video generation powered by ComfyUI.",
    openGraph: {
      title: "Shadowframe AI · Create Without Limits",
      description: "Text-to-image, image-to-image, image-to-video, and text-to-video in one focused studio.",
      images: [{ url: socialImage, width: 1536, height: 1024, alt: "Shadowframe AI creative generation dashboard" }],
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
