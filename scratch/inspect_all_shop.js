const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const productsRes = await pool.query('SELECT * FROM shop_products');
    console.log('Products:', JSON.stringify(productsRes.rows, null, 2));

    const sizesRes = await pool.query('SELECT * FROM shop_product_sizes');
    console.log('Sizes:', JSON.stringify(sizesRes.rows, null, 2));

    const categoriesRes = await pool.query('SELECT * FROM shop_categories');
    console.log('Categories:', JSON.stringify(categoriesRes.rows, null, 2));

    const slidesRes = await pool.query('SELECT * FROM shop_carousel_slides');
    console.log('Carousel Slides:', JSON.stringify(slidesRes.rows, null, 2));
    
    const bannerSlidesRes = await pool.query('SELECT * FROM banner_slides');
    console.log('Banner Slides:', JSON.stringify(bannerSlidesRes.rows, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
