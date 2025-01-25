/** @type {import('next').NextConfig} */
const config = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
  images: {
    domains: ["storage.googleapis.com"],
  },
};

export default config;
