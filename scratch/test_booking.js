const apiKey = 'ceuaml7bupbx2os7ml2xste5qnwgrkni';
const secretKey = '5icxfasrofpz27ailwonc2oq';
const baseUrl = 'https://portal.packzy.com/api/v1';

async function test() {
  const payload = {
    invoice: 'TEST-123456',
    recipient_name: 'Test Customer',
    recipient_phone: '01715050501',
    recipient_address: 'Dhanmondi, Dhaka',
    cod_amount: 100,
    note: 'Test order booking'
  };

  try {
    const response = await fetch(`${baseUrl}/create_order`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    const text = await response.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
