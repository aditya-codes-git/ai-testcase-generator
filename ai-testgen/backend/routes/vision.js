const express = require('express');
const router = express.Router();
const multer = require('multer');
const vision = require('@google-cloud/vision');
const { callGroq } = require('../utils/groq');

// Multer Setup
const upload = multer({ storage: multer.memoryStorage() });

// 1. Google Vision API Client (Zero-config for Cloud Run ADC)
const client = new vision.ImageAnnotatorClient();

/**
 * 1. CLEAN OCR TEXT
 * Removes extra spaces, newlines, and special characters. 
 * Normalizes spacing and returns readable sentences.
 */
function cleanOCRText(text) {
  if (!text) return "";
  return text
    // Replace multiple newlines with a single newline
    .replace(/\n+/g, '\n')
    // Remove weird special characters, keep standard punctuation and brackets
    .replace(/[^\w\s.,?!@#$%&*()\-+=\"':;<>\[\]{}]/g, '')
    // Replace multiple spaces with a single space
    .replace(/\s{2,}/g, ' ')
    // Trim leading/trailing whitespace
    .trim();
}

/**
 * 2. CONVERT OCR TEXT -> STRUCTURED UI
 * Uses groq to structure text into UI elements.
 */
async function extractUIStructure(text) {
  const systemPrompt = "You are an expert UI/UX structural analyzer. Output strictly valid JSON without any markdown formatting or explanation.";
  const userPrompt = `Analyze the following raw OCR text extracted from an application screen.
Identify the type of page and extract a structured list of UI elements (inputs, buttons, links, labels).

## RAW OCR TEXT
${text}

## EXPECTED JSON OUTPUT FORMAT
{
  "page": "Login Page",
  "elements": [
    { "type": "input", "name": "username" },
    { "type": "input", "name": "password" },
    { "type": "button", "name": "login" },
    { "type": "link", "name": "forgot password" }
  ]
}

Return ONLY JSON.`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  const generatedContent = await callGroq(messages, 0.1, { type: "json_object" });
  return JSON.parse(generatedContent);
}

/**
 * 3. GENERATE TEST CASES FROM STRUCTURED UI
 * Creates positive, negative, boundary, and edge test cases based on structured UI.
 */
async function generateTestCasesFromUI(structure) {
  const systemPrompt = "You are a senior QA automation engineer. Output strictly valid JSON without markdown formatting or explanation.";
  const userPrompt = `Generate clean, professional test cases for the given UI.

UI Structure:
${JSON.stringify(structure, null, 2)}

STRICT OUTPUT REQUIREMENTS:
1. Return ONLY valid JSON
2. Generate 8-12 test cases
3. Follow this EXACT structure

Each test case MUST include:
* testCaseId: "TC001", "TC002", etc.
* testSteps: ARRAY of steps (IMPORTANT: each step should be short and UI-action based)
* inputData: SINGLE STRING formatted exactly like: "username: user123, password: pass123"
* expectedResult: clear sentence (no long paragraphs)
* actualResult: ""
* testEnvironment: "Web"
* executionStatus: "Not Executed"
* bugSeverity: "None"
* bugPriority: "None"
* notes: one of ["Positive", "Negative", "Edge", "Boundary"]

🔥 CRITICAL FORMATTING RULES

1. testSteps MUST:
* Have 3-4 steps only
* Start with verbs like: Enter, Click, Navigate, Verify
* NO long sentences
GOOD: ["Enter valid username", "Enter valid password", "Click login button"]
BAD: ["User enters valid username and password and logs in"]

2. inputData MUST:
* Be short
* Always include key-value pairs
* NEVER empty or "-"

3. expectedResult MUST:
* Be short and UI-focused
* Examples: "Login successful, redirected to dashboard", "Error message: Invalid username or password", "Username is required"

4. INCLUDE MIX:
* 3 Positive cases
* 3 Negative cases
* 2 Edge cases
* 2 Boundary cases

🔥 OUTPUT FORMAT
{
  "projectDetails": {
    "projectName": "UI Image Analysis",
    "priority": "High",
    "description": "Test cases generated from analyzed UI elements",
    "testCaseAuthor": "AI Generator",
    "testCaseReviewer": "Pending",
    "testCaseVersion": "1.0",
    "testExecutionDate": ""
  },
  "testCases": [
    {
      "testCaseId": "TC001",
      "testSteps": [
        "Enter valid username",
        "Enter valid password",
        "Click login button"
      ],
      "inputData": "username: user123, password: pass123",
      "expectedResult": "Login successful, redirected to dashboard",
      "actualResult": "",
      "testEnvironment": "Web",
      "executionStatus": "Not Executed",
      "bugSeverity": "None",
      "bugPriority": "None",
      "notes": "Positive"
    }
  ]
}

Return ONLY JSON. No explanation.`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  const generatedContent = await callGroq(messages, 0.2, { type: "json_object" });
  return JSON.parse(generatedContent);
}

// POST /generate-from-image
router.post('/generate-from-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image uploaded' });
    }
    
    // 1. Vision OCR Extraction
    const [result] = await client.textDetection({ 
      image: { content: req.file.buffer } 
    });

    const detections = result.textAnnotations;
    if (!detections || detections.length === 0) {
      return res.status(400).json({ success: false, error: 'No text extracted from image' });
    }

    const rawText = result.fullTextAnnotation.text;
    if (!rawText) {
      return res.status(400).json({ success: false, error: 'No text extracted from image' });
    }

    // 2. Clean OCR Text
    const cleanText = cleanOCRText(rawText);
    if (!cleanText) {
      return res.status(400).json({ success: false, error: 'Cleaned text resulted in empty content' });
    }

    let parsedData;
    let uiStructure = {};

    try {
      // 3. Convert clean text -> Structured UI
      uiStructure = await extractUIStructure(cleanText);

      // 4. Generate Test Cases from Structured UI
      parsedData = await generateTestCasesFromUI(uiStructure);
    } catch (aiError) {
      console.warn('[Vision API Pipeline Warning]: AI Structure extraction failed. Falling back to clean text.', aiError.message);
      // Fallback: If UI Structuring step fails, attempt to generate directly from the cleaned text
      parsedData = await generateTestCasesFromUI({ rawTextContext: cleanText });
    }

    if (!parsedData || !parsedData.testCases || !Array.isArray(parsedData.testCases)) {
      return res.status(500).json({ success: false, error: "AI failed to generate structured test cases" });
    }

    // 5. Return formatted response (preserving existing contract for frontend)
    return res.json({
      success: true,
      data: {
        extractedText: cleanText,
        uiStructure: uiStructure,
        testCases: parsedData.testCases,
        projectDetails: parsedData.projectDetails || {
          projectName: "UI Image Analysis",
          priority: "Medium",
          description: "Test cases generated from uploaded application screenshot."
        }
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
