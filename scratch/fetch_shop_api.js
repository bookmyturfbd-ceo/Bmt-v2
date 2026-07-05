async function test() {
  try {
    const fetch = (await import('node-fetch')).default;
  } catch (e) {
    // If node-fetch is not installed, use global fetch (since node 18+)
  }
  
  try {
    console.log('Fetching products...');
    const rProds = await fetch('http://localhost:3000/api/shop/products');
    console.log('Products status:', rProds.status);
    const prods = await rProds.json();
    console.log('Products:', JSON.stringify(prods, null, 2));

    console.log('Fetching categories...');
    const rCats = await fetch('http://localhost:3000/api/shop/categories');
    console.log('Categories status:', rCats.status);
    const cats = await rCats.json();
    console.log('Categories:', JSON.stringify(cats, null, 2));

    console.log('Fetching carousel...');
    const rSlides = await fetch('http://localhost:3000/api/shop/carousel');
    console.log('Carousel status:', rSlides.status);
    const slides = await rSlides.json();
    console.log('Carousel:', JSON.stringify(slides, null, 2));
  } catch (err) {
    console.error('Fetch Error:', err);
  }
}

test();
