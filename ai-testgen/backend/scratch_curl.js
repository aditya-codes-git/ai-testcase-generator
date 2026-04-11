const fs = require('fs');
const path = require('path');

async function testEndpoint() {
  try {
    const imagePath = 'C:\\Users\\Aditya\\.gemini\\antigravity\\brain\\b4c9c2f3-e7e7-463f-a0d6-77f2a41cf26c\\media__1775891577329.png';
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Build multipart/form-data payload manually
    const boundary = '----WebKitFormBoundary7iMaZ9R5R7bUaH1V';
    const postData = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="image"; filename="media__1775891577329.png"\r\n`),
      Buffer.from(`Content-Type: image/png\r\n\r\n`),
      imageBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const res = await fetch('http://localhost:8080/generate-from-image', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: postData
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));

  } catch (err) {
    console.error("Test failed:", err);
  }
}

testEndpoint();
