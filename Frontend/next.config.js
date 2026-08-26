/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Do NOT hardcode a localhost fallback here — it masks a missing
    // NEXT_PUBLIC_API_URL in production. backendApiUrl() handles fallback.
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
      if (!clerkKey) {
        console.warn('⚠️  WARNING: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not configured for production')
      }
    }
    return config
  },
  // standalone is for Docker/self-host only; breaks Vercel's default Next.js output
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  // NOTE: API proxying is handled by server-side route handlers in app/api/*/*
  // which use backendApiUrl() to forward to the Render backend with auth.
  // Do NOT add rewrites() here — they conflict with the route handlers and
  // bypass auth forwarding, causing 401s in production.
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig
