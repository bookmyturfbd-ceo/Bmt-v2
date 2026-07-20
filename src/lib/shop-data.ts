import prisma from '@/lib/prisma';

export async function getShopFrontData() {
  const [slidesRaw, settings, categoriesRaw, products] = await Promise.all([
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
        { createdAt: 'desc' },
        { position: 'asc' }
      ],
    }),
  ]);

  // Sort children of each category to put Spain CA first
  const processedCategories = categoriesRaw.map(cat => {
    if (cat.children && cat.children.length > 0) {
      const spainChild = cat.children.find(c => c.name === 'Spain CA');
      const otherChildren = cat.children.filter(c => c.name !== 'Spain CA');
      return {
        ...cat,
        children: spainChild ? [spainChild, ...otherChildren] : cat.children
      };
    }
    return cat;
  });

  // Sort top-level categories to put Spain CA first
  const spainCategory = processedCategories.find(c => c.name === 'Spain CA');
  const otherCategories = processedCategories.filter(c => c.name !== 'Spain CA');
  const categories = spainCategory ? [spainCategory, ...otherCategories] : processedCategories;

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
