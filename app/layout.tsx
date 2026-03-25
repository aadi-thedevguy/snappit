import type { Metadata } from "next";
import { Karla, Geist } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { satoshi } from "../fonts/font";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const geistKarla = Karla({
  variable: "--font-geist-karla",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Snappit",
  description: "A Screen Sharing App",
  icons: {
    icon: "/assets/icons/logo.svg",
  },
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
