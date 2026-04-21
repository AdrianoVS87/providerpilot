/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: 'http://82.25.76.54:4001/:path*',
      },
    ];
  },
};

export default nextConfig;
