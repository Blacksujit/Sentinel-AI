/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000',
  },
  async rewrites() {
    const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const normalizedBackendBase = backendBase.endsWith('/') ? backendBase.slice(0, -1) : backendBase

    const destinationBase = normalizedBackendBase.endsWith('/api')
      ? normalizedBackendBase
      : `${normalizedBackendBase}/api`

    return [
      {
        source: '/api/settings/:path*',
        destination: `${destinationBase}/settings/:path*`,
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
        source: '/api/analyze/:path*',
        destination: `${destinationBase}/analyze/:path*`,
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
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
