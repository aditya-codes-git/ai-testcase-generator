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
    const systemPrompt = "You are a professional QA engineer who outputs strictly valid JSON.";
    const userPrompt = `You are a professional QA engineer.

Generate structured software test cases based on the following extracted UI text from an application screen.

---

## EXTRACTED UI TEXT

${extractedText}

---

## OUTPUT FORMAT (STRICT JSON ONLY)

Return ONLY valid JSON. No explanation. No extra text.

{
"projectDetails": {
"projectName": "UI Image Analysis",
"priority": "Medium",
"description": "Test cases generated from uploaded application screenshot.",
"testCaseAuthor": "AI Generator",
"testCaseReviewer": "",
"testCaseVersion": "1.0",
"testExecutionDate": ""
},
"testCases": [
{
"testCaseId": "TC001",
"testSteps": [
"Step 1",
"Step 2",
"Step 3"
],
"inputData": "",
"expectedResult": "",
"actualResult": "",
"testEnvironment": "Web",
"executionStatus": "Not Executed",
"bugSeverity": "None",
"bugPriority": "None",
"notes": ""
}
]
}

---

## REQUIREMENTS

* Generate at least 6-10 test cases covering the UI provided
* Include:
  * Positive cases
  * Negative cases
  * Edge cases
* Include validation scenarios:
  * Empty inputs
  * Invalid formats
  * Boundary values
* Ensure all fields are filled meaningfully
* Steps must be clear and actionable
* IDs must be sequential (TC001, TC002...)

---

## IMPORTANT RULES

* Do NOT skip any field
* Do NOT return explanations
* JSON must be valid and directly parsable`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    console.log("Sending extracted text to AI (Groq)...");
    const generatedContent = await callGroq(messages, 0.2, { type: "json_object" });
    console.log("AI Raw Response:", generatedContent);

    // Parse the JSON
    let parsedData;
    try {
      parsedData = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      return res.status(500).json({ success: false, error: "AI returned invalid JSON" });
    }

    // Ensure testCases is an array
    if (!parsedData.testCases || !Array.isArray(parsedData.testCases)) {
      console.error("Malformed AI Response: testCases is not an array");
      return res.status(500).json({ success: false, error: "AI failed to generate structured test cases" });
    }

    // 4. Return formatted response
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
    console.error('Vision/AI Processing Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Vision/AI processing failed' });
  }
});

module.exports = router;
