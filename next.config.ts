import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "shadowframe.tech",
        "www.shadowframe.tech",
      ],
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
