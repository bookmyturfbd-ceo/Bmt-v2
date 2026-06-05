import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';
import { Metadata } from 'next';
import {
  absoluteUrl,
  buildProductBreadcrumbJsonLd,
  buildProductJsonLd,
  localeAlternates,
  localePath,
  productDescription,
  productTitle,
  resolveImageUrl,
} from '@/lib/seo';

type PageParams = Promise<{ slug: string; locale: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { slug, locale } = await params;
  const product = await prisma.shopProduct.findFirst({
    where: { slug, status: 'active' },
    include: { sizes: true },
  });

  if (!product) {
    return {
      title: 'Product Not Found',
      robots: { index: false, follow: false },
    };
  }

  const title = productTitle(product);
  const description = productDescription(product);
  const canonical = absoluteUrl(localePath(locale, `/shop/product/${product.slug}`));
  const images = [resolveImageUrl(product.mainImage)];

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: localeAlternates(`/shop/product/${product.slug}`),
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Book My Turf BD',
      images: images.map((url) => ({ url })),
      locale: locale === 'bn' ? 'bn_BD' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
  };
}

export default async function ProductPage({ params }: { params: PageParams }) {
  const { slug, locale } = await params;
  const product = await prisma.shopProduct.findUnique({
    where: { slug, status: 'active' },
    include: {
      category: { include: { parent: true } },
      sizes: true,
    },
  });

  if (!product) return notFound();

  const activeDiscounts = await (prisma as any).shopDiscount.findMany({
    where: { active: true },
  });

  const productJsonLd = buildProductJsonLd(product, locale);
  const breadcrumbJsonLd = buildProductBreadcrumbJsonLd(product, locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ProductDetailClient product={product} activeDiscounts={activeDiscounts} />
    </>
  );
}
