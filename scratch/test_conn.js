const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function test(urlName, connectionString, ssl) {
  console.log(`Testing ${urlName} (SSL: ${ssl})...`);
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5000,
    ...(ssl ? { ssl: { rejectUnauthorized: false } } : {})
  });
  
  try {
    await client.connect();
    console.log(`  ✅ Connected to ${urlName}!`);
    const res = await client.query('SELECT COUNT(*)::int as count FROM shop_products');
    console.log(`  ✅ Query success! Products count:`, res.rows[0].count);
    
    const cats = await client.query('SELECT COUNT(*)::int as count FROM shop_categories');
    console.log(`  ✅ Query success! Categories count:`, cats.rows[0].count);
  } catch (err) {
    console.log(`  ❌ Failed for ${urlName}:`, err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;

  console.log('DATABASE_URL starts with:', dbUrl ? dbUrl.substring(0, 30) : 'none');
  console.log('DIRECT_URL starts with:', directUrl ? directUrl.substring(0, 30) : 'none');

  if (dbUrl) {
    await test('DATABASE_URL', dbUrl, false);
    await test('DATABASE_URL', dbUrl, true);
  }
  if (directUrl) {
    await test('DIRECT_URL', directUrl, false);
    await test('DIRECT_URL', directUrl, true);
  }
}

run();
