/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/dashboard',
        has: [{ type: 'host', value: 'www.docsflow.app' }],
        destination: '/select-workspace',
        permanent: false,
      },
      {
        source: '/dashboard',
        has: [{ type: 'host', value: 'docsflow.app' }],
        destination: '/select-workspace',
        permanent: false,
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
