import { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { getActiveShopProductsForSitemap } from '@/lib/shop-data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bookmyturfbd.com';

  const [turfs, shopProducts] = await Promise.all([
    prisma.turf.findMany({
      where: { status: 'published' },
      select: { id: true, updatedAt: true },
    }),
    getActiveShopProductsForSitemap(),
  ]);

  const locales = ['en', 'bn'];

  // Static routes
  const staticRoutes = [
    '', 
    '/book', 
    '/teams', 
    '/tournaments', 
    '/arena', 
    '/leaderboard', 
    '/shop', 
    '/login', 
    '/register', 
    '/organizer',
    '/organizer-signup'
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  locales.forEach(locale => {
    staticRoutes.forEach(route => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: route === '' ? 1 : 0.8,
      });
    });

    turfs.forEach(turf => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}/turf/${turf.id}`,
        lastModified: turf.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.9,
      });
    });

    shopProducts.forEach(product => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}/shop/product/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.85,
      });
    });
  });

  return sitemapEntries;
}
