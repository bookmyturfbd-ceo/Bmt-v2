import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET products — optionally filter by categoryId
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('categoryId');
  const status = searchParams.get('status') || undefined;

  const products = await prisma.shopProduct.findMany({
    where: {
      ...(categoryId ? { categoryId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      category: { select: { id: true, name: true, parentId: true } },
      sizes: { orderBy: { basePrice: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(products);
}

// POST — create a product with sizes
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name, categoryId, mainImage, galleryImages = [],
    description, seoTitle, seoDescription,
    productCost = 0, marketingCost = 0, status = 'active',
    sizes = [],
  } = body;

  if (!name || !categoryId || !mainImage) {
    return NextResponse.json({ error: 'name, categoryId, mainImage required' }, { status: 400 });
  }

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

  const product = await prisma.shopProduct.create({
    data: {
      name, slug, categoryId, mainImage,
      galleryImages,
      description: description || null,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      productCost: Number(productCost),
      marketingCost: Number(marketingCost),
      status,
      sizes: {
        create: sizes.map((s: any) => ({
          label: s.label,
          basePrice: Number(s.basePrice),
          salePrice: s.salePrice ? Number(s.salePrice) : null,
          quantity: Number(s.quantity || 0),
        })),
      },
    },
    include: { category: true, sizes: true },
  });
  return NextResponse.json(product);
}

// PATCH — update product details
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, sizes, ...rest } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updated = await prisma.shopProduct.update({
    where: { id },
    data: {
      ...(rest.name && { name: rest.name }),
      ...(rest.status && { status: rest.status }),
      ...(rest.description !== undefined && { description: rest.description }),
      ...(rest.mainImage && { mainImage: rest.mainImage }),
      ...(rest.galleryImages && { galleryImages: rest.galleryImages }),
      ...(rest.seoTitle !== undefined && { seoTitle: rest.seoTitle }),
      ...(rest.seoDescription !== undefined && { seoDescription: rest.seoDescription }),
      ...(rest.productCost !== undefined && { productCost: Number(rest.productCost) }),
      ...(rest.marketingCost !== undefined && { marketingCost: Number(rest.marketingCost) }),
      ...(rest.categoryId && { categoryId: rest.categoryId }),
    },
    include: { category: true, sizes: true },
  });
  return NextResponse.json(updated);
}

// DELETE — remove a product
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.shopProduct.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
