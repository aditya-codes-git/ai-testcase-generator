require('dotenv').config();
const vision = require('@google-cloud/vision');
const path = require('path');

async function testVision() {
  try {
    console.log('Env var GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    const keyPath = path.resolve(__dirname, process.env.GOOGLE_APPLICATION_CREDENTIALS || './vision-key.json');
    console.log('Resolved Key Path:', keyPath);
    
    // Explicitly pass the keyFilename to be sure
    const client = new vision.ImageAnnotatorClient({
      keyFilename: keyPath
    });
    
    console.log('Client initialized successfully');
    // Try a simple list call if possible, or just list properties
    console.log('Project ID:', await client.getProjectId());
    console.log('Vision test completed successfully');
  } catch (err) {
    console.error('Vision Test Failed:', err);
  }
}

testVision();
