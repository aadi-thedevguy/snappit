import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@snappit/db", "@snappit/inngest", "@snappit/validation", "@snappit/video-storage"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
