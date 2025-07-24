import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize builds for faster deployment
  // swcMinify is deprecated in Next.js 15
  
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
