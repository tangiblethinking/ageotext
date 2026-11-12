import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The chat route reads the guide at runtime; make sure it ships with the function.
  outputFileTracingIncludes: {
    "/api/chat": ["./public/guide-body.html"],
  },
};

export default nextConfig;
