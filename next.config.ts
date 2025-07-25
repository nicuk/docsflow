import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize builds for faster deployment
  // swcMinify is deprecated in Next.js 15
  
  // CORS headers for API routes
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: process.env.NODE_ENV === 'production' 
            ? "https://v0-ai-saas-s-landing-page-1w.vercel.app,https://*.vercel.app" 
            : "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Tenant-ID" },
        ]
      }
    ]
  },
  
  // Reduce memory usage during build
  experimental: {
    // Disable some experimental features that might cause hangs
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  
  // External packages for server components (moved from experimental)
  serverExternalPackages: ['@google/generative-ai', '@supabase/supabase-js'],
  
  // Improve build performance
  typescript: {
    // Don't fail build on type errors (we already check in CI)
    ignoreBuildErrors: false,
  },
  
  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Add build timeout protection
  staticPageGenerationTimeout: 300, // 5 minutes max
  
  // Optimize webpack for faster builds
  webpack: (config, { dev, isServer }) => {
    // Prevent hanging builds in production
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        // Prevent memory issues
        splitChunks: {
          ...config.optimization.splitChunks,
          maxSize: 244 * 1024, // 244kb max chunk size
        },
      };
    }
    
    return config;
  },
  
  // Server configuration
  serverRuntimeConfig: {
    // Timeout for API routes
    maxDuration: 60,
  },
};

export default nextConfig;
