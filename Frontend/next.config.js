/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000',
    // Remove fallback Clerk keys - they should be properly configured
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  },
  // Environment validation
  webpack: (config, { dev, isServer }) => {
    // Add environment validation for production
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
  async rewrites() {
    const raw = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    let backendBase = raw.trim().replace(/\/+$/, '')
    if (backendBase.endsWith('/api')) {
      backendBase = backendBase.slice(0, -4)
    }
    const destinationBase = `${backendBase}/api`

    return [
      {
        source: '/api/me',
        destination: `${destinationBase}/me`,
      },
      {
        source: '/api/orgs/:path*',
        destination: `${destinationBase}/orgs/:path*`,
      },
      {
        source: '/api/user/:path*',
        destination: `${destinationBase}/user/:path*`,
      },
      {
        source: '/api/settings/:path*',
        destination: `${destinationBase}/settings/:path*`,
      },
      {
        source: '/api/logs',
        destination: `${destinationBase}/logs`,
      },
      {
        source: '/api/logs/:path*',
        destination: `${destinationBase}/logs/:path*`,
      },
      {
        source: '/api/baselines/:path*',
        destination: `${destinationBase}/baselines/:path*`,
      },
      {
        source: '/api/analyze',
        destination: `${destinationBase}/analyze`,
      },
      {
        source: '/api/analyze/:path*',
        destination: `${destinationBase}/analyze/:path*`,
      },
      {
        source: '/api/api-keys/:path*',
        destination: `${destinationBase}/api-keys/:path*`,
      },
      {
        source: '/api/usage/:path*',
        destination: `${destinationBase}/usage/:path*`,
      },
      {
        source: '/api/learning/:path*',
        destination: `${destinationBase}/learning/:path*`,
      },
      {
        source: '/api/workspaces/:path*',
        destination: `${destinationBase}/workspaces/:path*`,
      },
      {
        source: '/api/invites/:path*',
        destination: `${destinationBase}/invites/:path*`,
      },
      {
        source: '/api/health',
        destination: `${destinationBase}/health`,
      },
      {
        source: '/api/debug',
        destination: `${destinationBase}/debug`,
      },
    ]
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig
