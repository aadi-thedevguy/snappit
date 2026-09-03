"use client";

import { usePathname } from "next/navigation";

import Navbar from "@/components/Navbar";

const RootNavbar = () => {
  const pathname = usePathname();

  if (pathname.startsWith("/share/")) return null;

  return <Navbar />;
};

export default RootNavbar;
