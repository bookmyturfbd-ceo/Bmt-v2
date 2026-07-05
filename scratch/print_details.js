const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    
    console.log('--- PRODUCTS ---');
    const prods = await client.query('SELECT * FROM shop_products');
    console.log(JSON.stringify(prods.rows, null, 2));

    console.log('--- PRODUCT SIZES ---');
    const sizes = await client.query('SELECT * FROM shop_product_sizes');
    console.log(JSON.stringify(sizes.rows, null, 2));

    console.log('--- CATEGORIES ---');
    const cats = await client.query('SELECT * FROM shop_categories');
    console.log(JSON.stringify(cats.rows, null, 2));

    console.log('--- CAROUSEL SLIDES ---');
    const slides = await client.query('SELECT * FROM shop_carousel_slides');
    console.log(JSON.stringify(slides.rows, null, 2));

    console.log('--- CAROUSEL SETTINGS ---');
    const settings = await client.query('SELECT * FROM shop_carousel_settings');
    console.log(JSON.stringify(settings.rows, null, 2));
    
    console.log('--- BANNER SLIDES ---');
    const banners = await client.query('SELECT * FROM banner_slides');
    console.log(JSON.stringify(banners.rows, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
