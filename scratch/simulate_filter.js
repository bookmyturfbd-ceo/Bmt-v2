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
  // 1. Fetch orders using the exact query from /api/shop/orders
  const orders = await prisma.shopOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          product: {
            select: {
              mainImage: true,
              name: true,
              productCost: true,
              marketingCost: true,
              category: { select: { id: true, name: true, parentId: true } },
              sizes: {
                select: {
                  label: true,
                  basePrice: true,
                  salePrice: true
                }
              }
            }
          }
        }
      }
    }
  });

  // 2. Fetch categories
  const categories = await prisma.shopCategory.findMany({
    include: { children: { orderBy: { order: 'asc' } } },
    orderBy: { order: 'asc' },
  });

  const categoriesMap = new Map();
  categories.forEach(c => categoriesMap.set(c.id, c));

  console.log('Total Orders loaded:', orders.length);

  // Set up the filter inputs from the user's screenshot
  // Parent Category: FIFA 2026 -> id: cmpyb3psr000104l7idx0nvs9
  // Subcategory: Brazil Polo -> id: cmpybh40s000404l7da735ojx
  // Product: Brazil W1 -> id: cmpyc1rgf000004jsc37p3rzx
  // Size: XL
  const filterParentCategoryId = "cmpyb3psr000104l7idx0nvs9";
  const filterSubCategoryId = "cmpybh40s000404l7da735ojx";
  const filterProductId = "cmpyc1rgf000004jsc37p3rzx";
  const filterSize = "XL";
  const selectedStatus = "ready";

  // Check how many orders have status "ready"
  const readyOrders = orders.filter(o => o.status === 'ready');
  console.log('Orders with status "ready":', readyOrders.length);

  let list = readyOrders;

  // Simulate filterParentCategoryId
  const listAfterParent = list.filter(order => {
    return (order.items || []).some((item) => {
      const product = item.product;
      if (!product) return false;
      const categoryId = product.categoryId || product.category?.id;
      if (!categoryId) return false;
      const cat = categoriesMap.get(categoryId);
      if (!cat) return false;
      const parentId = cat.parentId || cat.id;
      return parentId === filterParentCategoryId;
    });
  });
  console.log('After filterParentCategoryId:', listAfterParent.length);

  // Simulate filterSubCategoryId
  const listAfterSub = listAfterParent.filter(order => {
    return (order.items || []).some((item) => {
      const product = item.product;
      if (!product) return false;
      const categoryId = product.categoryId || product.category?.id;
      if (!categoryId) return false;
      return categoryId === filterSubCategoryId || (filterSubCategoryId === 'direct' && categoryId === filterParentCategoryId);
    });
  });
  console.log('After filterSubCategoryId:', listAfterSub.length);

  // Simulate filterProductId
  const listAfterProduct = listAfterSub.filter(order => {
    return (order.items || []).some((item) => {
      return item.productId === filterProductId;
    });
  });
  console.log('After filterProductId:', listAfterProduct.length);

  if (listAfterSub.length > 0 && listAfterProduct.length === 0) {
    console.log('Checking first item from subcategory match to see why product filter fails:');
    const exampleItem = listAfterSub[0].items[0];
    console.log('Item keys:', Object.keys(exampleItem));
    console.log('Item values:', JSON.stringify({
      id: exampleItem.id,
      productId: exampleItem.productId,
      sizeLabel: exampleItem.sizeLabel,
      productName: exampleItem.product?.name
    }, null, 2));
  }

  // Simulate filterSize
  const listAfterSize = listAfterProduct.filter(order => {
    return (order.items || []).some((item) => {
      return item.sizeLabel?.toLowerCase() === filterSize.toLowerCase();
    });
  });
  console.log('After filterSize:', listAfterSize.length);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
