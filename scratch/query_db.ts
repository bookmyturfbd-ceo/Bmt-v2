import dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/lib/prisma';

async function main() {
  const readyOrders = await prisma.shopOrder.findMany({
    where: { status: 'ready' },
    include: {
      items: {
        include: {
          product: {
            include: {
              category: true,
            }
          }
        }
      }
    }
  });

  console.log('Total Ready Orders in DB:', readyOrders.length);
  if (readyOrders.length > 0) {
    const o = readyOrders[0];
    console.log('First Ready Order:', JSON.stringify({
      id: o.id,
      customerName: o.customerName,
      status: o.status,
      items: o.items.map(i => ({
        id: i.id,
        productId: i.productId,
        productName: i.product?.name,
        categoryId: i.product?.categoryId,
        category: i.product?.category ? {
          id: i.product.category.id,
          name: i.product.category.name,
          parentId: i.product.category.parentId
        } : null
      }))
    }, null, 2));
  }

  const allCategories = await prisma.shopCategory.findMany({});
  console.log('Total Categories:', allCategories.length);
  console.log('Categories:', JSON.stringify(allCategories.map(c => ({ id: c.id, name: c.name, parentId: c.parentId })), null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
