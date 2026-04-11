const express = require('express');
const router = express.Router();
const multer = require('multer');
const vision = require('@google-cloud/vision');
const { callGroq } = require('../utils/groq');

const path = require('path');

// Multer Setup
const upload = multer({ storage: multer.memoryStorage() });

// Google Vision API Client
let visionClient = null;
function getVisionClient() {
  if (!visionClient) {
    const envKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './vision-key.json';
    const keyPath = path.resolve(__dirname, '..', envKeyPath);
    console.log("Resolved Vision API Key Path:", keyPath);
    visionClient = new vision.ImageAnnotatorClient({
      keyFilename: keyPath
    });
  }
  return visionClient;
}

// POST /generate-from-image
router.post('/generate-from-image', upload.single('image'), async (req, res) => {
  console.log("-----------------------------------------");
  console.log("POST /generate-from-image called");
  try {
    if (!req.file) {
      console.log("Error: No image uploaded");
      return res.status(400).json({ success: false, error: 'No image uploaded' });
    }
    
    console.log("File received:", req.file.originalname, "Mimetype:", req.file.mimetype);
    console.log("Buffer length:", req.file?.buffer?.length);

    // 1. Vision API Integration
    console.log("Initializing Vision API Client...");
    const client = getVisionClient();
    console.log("Calling Vision API textDetection...");
    const [result] = await client.textDetection({ image: { content: req.file.buffer } });
    console.log("Vision API Response received.");
    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      return res.status(400).json({ success: false, error: 'No text extracted from image' });
    }

    // 2. Extract and Clean Text
    let extractedText = result.fullTextAnnotation.text;
    if (!extractedText) {
      return res.status(400).json({ success: false, error: 'No text extracted from image' });
    }

    // Clean text (remove extra spaces and lines)
    extractedText = extractedText.replace(/\n+/g, '\n').replace(/\s{2,}/g, ' ').trim();
    if (extractedText.length > 5000) {
      extractedText = extractedText.substring(0, 5000); // Limit length
    }

    // 3. AI Processing (Groq)
    const systemPrompt = "You are a senior QA engineer.";
    const userPrompt = `Given the following UI text extracted from an application screen:

${extractedText}

Your task is to generate high-quality test cases.

Requirements:

* Include functional test cases
* Include edge cases
* Include negative test cases
* Avoid duplicates
* Keep test cases practical and realistic

Format strictly as:

Test Case ID: TC_001
Title: <short title>
Steps:

1. Step 1
2. Step 2

Expected Result: <expected output>

Return ONLY test cases.
Do NOT include explanations.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    console.log("Sending extracted text to AI (Groq)...");
    // Use null for responseFormat since the user strictly wants text, not JSON wrapper
    const generatedContent = await callGroq(messages, 0.2, null);
    console.log("AI Generation complete.");

    // 4. Return formatted response
    return res.json({
      success: true,
      extractedText: extractedText,
      testCases: generatedContent.trim()
    });

  } catch (error) {
    console.error('Vision/AI Processing Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Vision/AI processing failed' });
  }
});

module.exports = router;
