import { routing } from '@/i18n/routing';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bookmyturfbd.com';

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function localePath(locale: string, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `/${locale}${normalized === '/' ? '' : normalized}`;
}

export function localeAlternates(path: string): Record<string, string> {
  const alternates: Record<string, string> = {};
  for (const locale of routing.locales) {
    alternates[locale] = absoluteUrl(localePath(locale, path));
  }
  return alternates;
}

export function resolveImageUrl(imageUrl?: string | null): string {
  if (!imageUrl) return absoluteUrl('/bmt-logo.png');
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  return absoluteUrl(imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`);
}

export function productTitle(product: { seoTitle?: string | null; name: string }): string {
  return product.seoTitle || product.name;
}

export function productDescription(product: {
  seoDescription?: string | null;
  description?: string | null;
  name: string;
}): string {
  if (product.seoDescription) return product.seoDescription;
  if (product.description) return product.description.slice(0, 160);
  return `Buy ${product.name} from BMT Shop. Official sports merchandise and gear in Bangladesh.`;
}

type ShopProductForSchema = {
  name: string;
  slug: string;
  description?: string | null;
  seoDescription?: string | null;
  mainImage: string;
  galleryImages?: string[];
  sizes: { basePrice: number; salePrice?: number | null; quantity: number }[];
};

export function buildProductJsonLd(
  product: ShopProductForSchema,
  locale: string
): Record<string, unknown> {
  const prices = product.sizes.map((s) => s.salePrice ?? s.basePrice);
  const lowPrice = prices.length ? Math.min(...prices) : 0;
  const highPrice = prices.length ? Math.max(...prices) : 0;
  const inStock = product.sizes.some((s) => s.quantity > 0);
  const images = [product.mainImage, ...(product.galleryImages || [])].map(resolveImageUrl);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: productDescription(product),
    image: images,
    url: absoluteUrl(localePath(locale, `/shop/product/${product.slug}`)),
    brand: {
      '@type': 'Brand',
      name: 'BMT Shop',
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'BDT',
      lowPrice,
      highPrice,
      offerCount: product.sizes.length,
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };
}

type ShopListProduct = {
  name: string;
  slug: string;
  mainImage: string;
  sizes: { basePrice: number; salePrice?: number | null }[];
};

export function buildShopItemListJsonLd(
  products: ShopListProduct[],
  locale: string
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'BMT Shop Products',
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => {
      const prices = product.sizes.map((s) => s.salePrice ?? s.basePrice);
      const minPrice = prices.length ? Math.min(...prices) : 0;

      return {
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(localePath(locale, `/shop/product/${product.slug}`)),
        item: {
          '@type': 'Product',
          name: product.name,
          image: resolveImageUrl(product.mainImage),
          offers: {
            '@type': 'Offer',
            priceCurrency: 'BDT',
            price: minPrice,
          },
        },
      };
    }),
  };
}

export function buildProductBreadcrumbJsonLd(
  product: { name: string; slug: string; category?: { name: string } | null },
  locale: string
): Record<string, unknown> {
  const items = [
    { name: 'BMT Shop', path: '/shop' },
    ...(product.category ? [{ name: product.category.name, path: '/shop' }] : []),
    { name: product.name, path: `/shop/product/${product.slug}` },
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(localePath(locale, item.path)),
    })),
  };
}
