import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Simplified configuration to avoid middleware issues
  
  // 🚀 SURGICAL FIX: Next.js native redirects for main domain dashboard
  async redirects() {
    return [
      {
        source: '/dashboard',
        has: [
          {
            type: 'host',
            value: 'www.docsflow.app',
          },
        ],
        destination: '/select-workspace',
        permanent: false,
      },
      {
        source: '/dashboard',
        has: [
          {
            type: 'host', 
            value: 'docsflow.app',
          },
        ],
        destination: '/select-workspace',
        permanent: false,
      }
    ]
  },
  
  // External packages for server components
  serverExternalPackages: ['@google/generative-ai', '@supabase/supabase-js'],
  
  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Simplified webpack config
  webpack: (config, { dev, isServer }) => {
    // Basic optimization for production
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
      };
    }
    
    return config;
  },
  
  // TypeScript configuration to match working frontend
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ESLint configuration to match working frontend
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
