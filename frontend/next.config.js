/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  transpilePackages: ['framer-motion', 'react-remove-scroll'],
  reactStrictMode: false,
  experimental: {
    optimizeCss: false,
    optimizePackageImports: [],
    serverComponentsExternalPackages: ["framer-motion"],
  },
  swcMinify: false,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
