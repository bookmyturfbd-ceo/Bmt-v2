const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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

  // Let's also check if there are orders with status 'ready' that contain 'Brazil W1'
  const targetProduct = await prisma.shopProduct.findFirst({
    where: { name: { contains: 'Brazil W1' } }
  });
  if (targetProduct) {
    console.log('Target Product (Brazil W1):', JSON.stringify(targetProduct, null, 2));
    const matchingItems = await prisma.shopOrderItem.findMany({
      where: {
        productId: targetProduct.id,
        order: { status: 'ready' }
      },
      include: {
        order: true
      }
    });
    console.log(`Ready Orders containing Brazil W1 (count: ${matchingItems.length}):`, matchingItems.map(mi => ({
      orderId: mi.orderId,
      sizeLabel: mi.sizeLabel,
      quantity: mi.quantity
    })));
  } else {
    console.log('No product found matching Brazil W1');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
