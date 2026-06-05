import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bookmyturfbd.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/en/admin/',
        '/bn/admin/',
        '/en/dashboard/',
        '/bn/dashboard/',
        '/en/profile/',
        '/bn/profile/',
        '/en/shop/checkout',
        '/bn/shop/checkout',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
