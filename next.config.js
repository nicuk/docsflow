/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['next-mdx-remote'],

  async redirects() {
    return [
      // www -> naked domain (all paths)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.docsflow.app' }],
        destination: 'https://docsflow.app/:path*',
        permanent: true,
      },
      // dashboard -> select-workspace
      {
        source: '/dashboard',
        has: [{ type: 'host', value: 'docsflow.app' }],
        destination: '/select-workspace',
        permanent: true,
      },
      // Legacy 404 URLs from GSC — all point to public (non-auth) pages
      // to avoid redirect chains through Clerk middleware
      { source: '/my', destination: '/', permanent: true },
      { source: '/demo-video', destination: '/#features', permanent: true },
      { source: '/about', destination: '/', permanent: true },
      { source: '/settings', destination: '/', permanent: true },
      { source: '/try', destination: '/#contact', permanent: true },
      { source: '/careers', destination: '/', permanent: true },
      { source: '/documentation', destination: '/docs', permanent: true },
    ]
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  webpack: (config, { dev }) => {
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
