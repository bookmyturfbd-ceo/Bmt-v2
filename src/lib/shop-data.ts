import prisma from '@/lib/prisma';

export async function getShopFrontData() {
  const [slidesRaw, settings, categories, products] = await Promise.all([
    prisma.shopCarouselSlide.findMany({ orderBy: { order: 'asc' } }),
    prisma.shopCarouselSettings.findFirst(),
    prisma.shopCategory.findMany({
      where: { active: true },
      include: { children: { where: { active: true }, orderBy: { order: 'asc' } } },
      orderBy: { order: 'asc' },
    }),
    prisma.shopProduct.findMany({
      where: {
        status: 'active',
        category: { active: true },
      },
      include: {
        category: { select: { id: true, name: true, parentId: true } },
        sizes: { orderBy: { basePrice: 'asc' } },
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'desc' }
      ],
    }),
  ]);

  return {
    slides: slidesRaw.filter((s) => s.active),
    settings: settings ?? { autoSlide: true, intervalMs: 3500, slideType: 'auto' },
    categories,
    products,
  };
}

export async function getActiveShopProductsForSitemap() {
  return prisma.shopProduct.findMany({
    where: { status: 'active' },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });
}
