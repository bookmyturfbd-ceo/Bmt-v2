import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const p = await prisma.shopProduct.findUnique({ where: { slug: resolvedParams.slug } });
  if (!p) return { title: 'Not Found' };
  return {
    title: p.seoTitle || p.name,
    description: p.seoDescription || p.description?.slice(0, 150),
    openGraph: { images: [p.mainImage] }
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string, locale: string }> }) {
  const resolvedParams = await params;
  const product = await prisma.shopProduct.findUnique({
    where: { slug: resolvedParams.slug, status: 'active' },
    include: {
      category: { include: { parent: true } },
      sizes: true
    }
  });

  if (!product) return notFound();

  return <ProductDetailClient product={product} />
}
