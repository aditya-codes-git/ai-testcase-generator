const express = require('express');
const router = express.Router();
const multer = require('multer');
const vision = require('@google-cloud/vision');
const { callGroq } = require('../utils/groq');

const upload = multer({ storage: multer.memoryStorage() });
const client = new vision.ImageAnnotatorClient();

/* ---------- SAFE JSON PARSER ---------- */
function extractJSON(text) {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    return JSON.parse(text.substring(start, end + 1));
  } catch (e) {
    console.error("❌ JSON Parse Failed:", text);
    throw new Error("Invalid JSON from AI");
  }
}

/* ---------- CLEAN OCR ---------- */
function cleanOCRText(text) {
  if (!text) return "";
  return text
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ---------- UI STRUCTURE ---------- */
async function extractUIStructure(text) {
  const messages = [
    {
      role: "system",
      content: "You are a UI analyzer. Return ONLY JSON."
    },
    {
      role: "user",
      content: `
Convert this OCR text into UI structure:

${text}

Return:
{
"page": "Page Name",
"elements": [
{"type":"input","name":"username"},
{"type":"input","name":"password"},
{"type":"button","name":"login"}
]
}`
    }
  ];

  const raw = await callGroq(messages, 0.3);
  console.log("🧠 UI RAW:", raw);

  return extractJSON(raw);
}

/* ---------- TEST CASE GENERATOR ---------- */
async function generateTestCasesFromUI(data) {
  const messages = [
    {
      role: "system",
      content: "You are a QA engineer. Return ONLY JSON."
    },
    {
      role: "user",
      content: `
Generate test cases from UI.

UI:
${JSON.stringify(data.uiStructure || data)}

Context:
${data.rawText || ""}

RULES:

* 10 test cases
* steps: 3 short steps
* inputData must NOT be "-"
* expectedResult must NOT be "-"
* realistic values only

FORMAT:
{
"testCases":[
{
"testCaseId":"TC001",
"testSteps":["Enter username","Enter password","Click login"],
"inputData":"username: user123, password: pass123",
"expectedResult":"Login successful",
"testEnvironment":"Web",
"executionStatus":"Not Executed",
"bugSeverity":"None",
"bugPriority":"None",
"notes":"Positive"
}
]
}`
    }
  ];

  const raw = await callGroq(messages, 0.4);
  console.log("🔥 TEST RAW:", raw);

  return extractJSON(raw);
}

/* ---------- ROUTE ---------- */
router.post('/generate-from-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image uploaded' });
    }

    ```
const [result] = await client.textDetection({
  image: { content: req.file.buffer }
});

const rawText = result.fullTextAnnotation?.text;
if (!rawText) {
  return res.status(400).json({ success: false, error: 'No text extracted' });
}

const cleanText = cleanOCRText(rawText);

let uiStructure = {};
let parsed;

try {
  console.log("🔥 NEW PIPELINE ACTIVE");

  uiStructure = await extractUIStructure(cleanText);

  parsed = await generateTestCasesFromUI({
    uiStructure,
    rawText: cleanText
  });

} catch (err) {
  console.warn("⚠️ Fallback triggered:", err.message);

  parsed = await generateTestCasesFromUI({
    rawText: cleanText
  });
}

return res.json({
  success: true,
  data: {
    extractedText: cleanText,
    uiStructure,
    testCases: parsed.testCases || [],
    projectDetails: parsed.projectDetails || {}
  }
});
```

  } catch (error) {
    console.error("❌ ERROR:", error);
    res.status(500).json({ success: false, error: "Processing failed" });
  }
});

module.exports = router;
