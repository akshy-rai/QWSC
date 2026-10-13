import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native addons and Prisma client out of the Next.js bundler
  serverExternalPackages: ["@node-rs/argon2", "@prisma/client", "prisma"],
};

export default nextConfig;
