/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,

  serverExternalPackages: ["firebase-admin"],

  // Enable TypeScript checks during production builds
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;