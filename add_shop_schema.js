const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

const shopModels = `

// ─────────────────────────────────────────────────────────────────────────────
// SHOP — E-commerce Layer
// ─────────────────────────────────────────────────────────────────────────────

model ShopCarouselSlide {
  id         String   @id @default(cuid())
  imageUrl   String
  ctaText    String?
  ctaLink    String?
  order      Int      @default(0)
  active     Boolean  @default(true)
  createdAt  DateTime @default(now())

  @@map("shop_carousel_slides")
}

model ShopCarouselSettings {
  id         String   @id @default("singleton")
  autoSlide  Boolean  @default(true)
  intervalMs Int      @default(3500)
  slideType  String   @default("auto")
  updatedAt  DateTime @updatedAt

  @@map("shop_carousel_settings")
}

model ShopCategory {
  id        String         @id @default(cuid())
  name      String
  slug      String         @unique
  parentId  String?
  order     Int            @default(0)
  imageUrl  String?
  parent    ShopCategory?  @relation("SubCategories", fields: [parentId], references: [id], onDelete: SetNull)
  children  ShopCategory[] @relation("SubCategories")
  products  ShopProduct[]
  createdAt DateTime       @default(now())

  @@map("shop_categories")
}

model ShopProduct {
  id              String   @id @default(cuid())
  name            String
  slug            String   @unique
  categoryId      String
  mainImage       String
  galleryImages   String[] @default([])
  description     String?
  seoTitle        String?
  seoDescription  String?
  productCost     Float    @default(0)
  marketingCost   Float    @default(0)
  status          String   @default("active")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  category  ShopCategory      @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  sizes     ShopProductSize[]

  @@map("shop_products")
}

model ShopProductSize {
  id          String   @id @default(cuid())
  productId   String
  label       String
  basePrice   Float
  salePrice   Float?
  quantity    Int      @default(0)

  product  ShopProduct @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("shop_product_sizes")
}
`;

if (!schema.includes('ShopCarouselSlide')) {
  schema = schema.trimEnd() + '\n' + shopModels;
  fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
  console.log('Schema updated! Total lines:', schema.split('\n').length);
} else {
  console.log('Shop models already exist in schema');
}
