/** @type {import('next').NextConfig} */
const nextConfig = {
  // Setting this entirely to false wipes out ALL Next.js development badges
  devIndicators: false,

  // Prevents Vercel from bundling firebase-admin and triggering ERR_REQUIRE_ESM
  serverExternalPackages: ["firebase-admin"],

  // Resolves the jose/jwks-rsa ESM requirement error on Vercel
  transpilePackages: ["jose", "jwks-rsa"],

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;