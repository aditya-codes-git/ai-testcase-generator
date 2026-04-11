const express = require('express');
const router = express.Router();
const multer = require('multer');
const vision = require('@google-cloud/vision');
const { callGroq } = require('../utils/groq');

// Multer Setup
const upload = multer({ storage: multer.memoryStorage() });

// 1. Google Vision API Client (Zero-config for Cloud Run ADC)
const visionClient = new vision.ImageAnnotatorClient();

// POST /generate-from-image
router.post('/generate-from-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image uploaded' });
    }
    
    // 2. Vision API Integration
    // Image content is passed directly from memory storage
    const [result] = await visionClient.textDetection({ 
      image: { content: req.file.buffer } 
    });

    const detections = result.textAnnotations;
    if (!detections || detections.length === 0) {
      return res.status(400).json({ success: false, error: 'No text extracted from image' });
    }

    // 3. Extract and Clean Text
    let extractedText = result.fullTextAnnotation.text;
    if (!extractedText) {
      return res.status(400).json({ success: false, error: 'No text extracted from image' });
    }

    // Clean text (remove extra spaces and lines)
    extractedText = extractedText.replace(/\n+/g, '\n').replace(/\s{2,}/g, ' ').trim();
    if (extractedText.length > 5000) {
      extractedText = extractedText.substring(0, 5000); // Limit length
    }

    // 4. AI Processing (Groq)
    const systemPrompt = "You are a professional QA engineer who outputs strictly valid JSON.";
    const userPrompt = `You are a professional QA engineer. Generate structured software test cases based on the following extracted UI text.
    
    ## EXTRACTED UI TEXT
    ${extractedText}
    
    ## OUTPUT FORMAT (STRICT JSON ONLY)
    {
      "projectDetails": { ... },
      "testCases": [ { ... } ]
    }`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    const generatedContent = await callGroq(messages, 0.2, { type: "json_object" });

    // Parse the JSON
    let parsedData;
    try {
      parsedData = JSON.parse(generatedContent);
    } catch (parseError) {
      return res.status(500).json({ success: false, error: "AI returned invalid JSON" });
    }

    if (!parsedData.testCases || !Array.isArray(parsedData.testCases)) {
      return res.status(500).json({ success: false, error: "AI failed to generate structured test cases" });
    }

    // 5. Return formatted response
    return res.json({
      success: true,
      extractedText: extractedText,
      testCases: parsedData.testCases,
      projectDetails: parsedData.projectDetails || {
        projectName: "UI Image Analysis",
        priority: "Medium",
        description: "Test cases generated from uploaded application screenshot."
      }
    });

  } catch (error) {
    console.error('[Vision API Error]:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Vision/AI processing failed', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

module.exports = router;
