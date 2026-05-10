import { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bookmyturfbd.com';

  const turfs = await prisma.turf.findMany({
    where: { status: 'published' },
    select: { id: true, updatedAt: true }
  });

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
  });

  return sitemapEntries;
}
