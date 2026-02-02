/** @type {import('next').NextConfig} */
const nextConfig = {
  // Firebase Hosting requires static export
  output: 'export',
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  
  // Base path for Firebase Hosting
  basePath: '',
  
  // Asset prefix for Firebase Hosting
  assetPrefix: '',
  
  // Trailing slash for Firebase Hosting
  trailingSlash: true,
  
  // Environment variables for Firebase
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://us-central1-sentinelai-mvp.cloudfunctions.net',
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'production'
  },
  
  // Webpack configuration for Firebase
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
  
  // React strict mode
  reactStrictMode: true,
  
  // SWC minification
  swcMinify: true,
}

module.exports = nextConfig
