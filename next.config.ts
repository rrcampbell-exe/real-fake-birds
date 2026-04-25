import type { NextConfig } from "next";
import path from "path";

const securityHeaders = [
  // Disallow framing by any origin — prevents clickjacking.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME-type sniffing.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Limit referrer info sent cross-origin.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Lock down unused browser features.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  // Enforce HTTPS for 2 years (only active when served over HTTPS).
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'cdn.realfakebirds.app',
      },
    ],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins: ['capacitor://localhost', 'http://localhost:3000', 'http://10.0.2.2:3000']
};

export default nextConfig;
