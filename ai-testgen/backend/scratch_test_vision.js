require('dotenv').config();
const vision = require('@google-cloud/vision');

/**
 * Production-ready Vision API test script.
 * 
 * This script uses Application Default Credentials (ADC).
 * No JSON key file is required when running on Cloud Run or locally with gcloud auth.
 */
async function testVision() {
  try {
    console.log('>>> Initializing Vision API Client with Default Credentials...');
    
    // Automatic initialization - picks up credentials from the environment (ADC)
    const client = new vision.ImageAnnotatorClient();
    
    console.log('>>> Client initialized successfully');
    
    // Verify connectivity by fetching Project ID
    const projectId = await client.getProjectId();
    console.log('>>> Connected to Project:', projectId);
    
    console.log('>>> Vision API test completed successfully.');
  } catch (err) {
    console.error('!!! Vision API Test Failed:', err.message);
    console.log('\nPossible causes:');
    console.log('1. Local: Run "gcloud auth application-default login"');
    console.log('2. Cloud Run: Ensure service account has "Cloud Vision API User" role.');
  }
}

testVision();
