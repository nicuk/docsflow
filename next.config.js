/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.docsflow.app' }],
        destination: 'https://docsflow.app/:path*',
        permanent: true,
      },
      {
        source: '/dashboard',
        has: [{ type: 'host', value: 'docsflow.app' }],
        destination: '/select-workspace',
        permanent: true,
      },
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
