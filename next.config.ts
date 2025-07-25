import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Simplified configuration to avoid middleware issues
  
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
};

export default nextConfig;
