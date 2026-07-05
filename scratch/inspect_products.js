const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

async function main() {
  console.log('Connecting to:', process.env.DIRECT_URL ? 'DIRECT_URL' : 'None');
  const pool = new Pool({ connectionString: process.env.DIRECT_URL });
  try {
    console.log('Querying categories...');
    const cats = await pool.query('SELECT id, name, slug FROM shop_categories');
    console.log('Categories:', cats.rows);

    console.log('Querying products...');
    const prods = await pool.query('SELECT id, name, slug, "categoryId", status FROM shop_products');
    console.log('Products:', prods.rows);

    console.log('Querying slides...');
    const slides = await pool.query('SELECT id, "imageUrl", active FROM shop_carousel_slides');
    console.log('Slides:', slides.rows);
  } catch (err) {
    console.error('Query Error:', err);
  } finally {
    await pool.end();
  }
}

main();
