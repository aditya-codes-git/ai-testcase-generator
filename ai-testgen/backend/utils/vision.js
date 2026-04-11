const vision = require('@google-cloud/vision');

let visionClient = null;

function getVisionClient() {
  if (!visionClient) {
    // The Vision client automatically picks up GOOGLE_APPLICATION_CREDENTIALS from the env
    visionClient = new vision.ImageAnnotatorClient();
  }
  return visionClient;
}

// Extract text from an image buffer
async function extractTextFromImage(imageBuffer) {
  try {
    const client = getVisionClient();
    const [result] = await client.textDetection({ image: { content: imageBuffer } });
    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      return "";
    }
    
    // The first item in textAnnotations contains the full text
    return detections[0].description;
  } catch (error) {
    console.error('Vision API Error:', error);
    throw new Error('Failed to extract text from image using Vision API');
  }
}

module.exports = {
  extractTextFromImage
};
