/** @type {import('next').NextConfig} */
const nextConfig = {
  // Setting this entirely to false wipes out ALL Next.js development badges
  devIndicators: false,

  // Tells Next.js and Vercel to treat firebase-admin as a native Node.js server package
  serverExternalPackages: ["firebase-admin"],

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;