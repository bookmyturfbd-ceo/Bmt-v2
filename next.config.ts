import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  allowedDevOrigins: ['100.113.195.39'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bvimgjnauzbpauyhjrky.supabase.co',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
