async function main() {
  const url = 'http://localhost:3000/api/bmt/players/cmnw1gsmq000gichw4dq4d0y7';
  console.log(`Fetching ${url}...`);
  try {
    const res = await fetch(url);
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response JSON:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

main();
