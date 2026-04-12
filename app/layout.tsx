import type { Metadata } from "next";
import { Karla, Geist } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { satoshi } from "../fonts/font";
import { cn } from "@/lib/utils";
import {
  APP_TITLE,
  APP_DESCRIPTION,
  SITE_URL,
  THUMBNAIL_URL,
  FAVICON_URL,
  MANIFEST_URL,
  APPLE_ICON_URL,
} from "@/constants";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const geistKarla = Karla({
  variable: "--font-geist-karla",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_TITLE,
  description: APP_DESCRIPTION,
  openGraph: {
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    url: SITE_URL,
    siteName: APP_TITLE,
    images: [
      {
        url: THUMBNAIL_URL, // Must be an absolute URL
        width: 1200,
        height: 630,
        alt: "Snappit Thumbnail",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  icons: {
    icon: FAVICON_URL,
    shortcut: FAVICON_URL,
    apple: APPLE_ICON_URL,
  },
  manifest: MANIFEST_URL,
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body
        className={`${geistKarla.variable} ${satoshi.variable} font-karla antialiased`}
      >
        <Toaster richColors position="top-center" />
        {children}
      </body>
    </html>
  );
}
