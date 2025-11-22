import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Skip trailing slash redirect for API routes
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
