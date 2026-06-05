import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ShopFrontClient from './ShopFrontClient';
import { getShopFrontData } from '@/lib/shop-data';
import {
  absoluteUrl,
  buildShopItemListJsonLd,
  localeAlternates,
  localePath,
  resolveImageUrl,
} from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Shop' });

  const title = t('metaTitle');
  const description = t('metaDescription');
  const canonical = absoluteUrl(`/${locale}/shop`);

  return {
    title,
    description,
    keywords: t('metaKeywords').split(',').map((k) => k.trim()),
    alternates: {
      canonical,
      languages: localeAlternates('/shop'),
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Book My Turf BD',
      images: [{ url: resolveImageUrl('/bmt-logo.png'), width: 800, height: 600, alt: 'BMT Shop' }],
      locale: locale === 'bn' ? 'bn_BD' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [resolveImageUrl('/bmt-logo.png')],
    },
  };
}

export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const shopData = await getShopFrontData();

  const itemListJsonLd = buildShopItemListJsonLd(shopData.products, locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <nav aria-label="Product catalog" className="sr-only">
        <ul>
          {shopData.products.map((product) => (
            <li key={product.id}>
              <a href={absoluteUrl(localePath(locale, `/shop/product/${product.slug}`))}>
                {product.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <ShopFrontClient initialData={shopData} />
    </>
  );
}
