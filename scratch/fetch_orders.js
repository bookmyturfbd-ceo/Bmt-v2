async function main() {
  try {
    const res = await fetch('http://localhost:3000/api/shop/orders');
    console.log('API Status:', res.status);
    const data = await res.json();
    console.log('Total Orders fetched:', data.length);
    if (data.length > 0) {
      console.log('First order JSON:', JSON.stringify(data[0], null, 2));
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

main();
