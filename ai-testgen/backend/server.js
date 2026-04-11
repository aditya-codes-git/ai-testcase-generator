require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { generateAutomationScript, refineTestCases, generateTestCasesFromText } = require('./utils/gemini');
const { extractTextFromImage } = require('./utils/vision');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuration
app.use(cors());
app.use(express.json());

// Set up multer for handling multipart/form-data (image uploads)
const upload = multer({ storage: multer.memoryStorage() });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'TestGen AI Backend is running' });
});

// Endpoint: Generate Automation Script
app.post('/generate-script', async (req, res) => {
  try {
    const { testCases } = req.body;
    
    if (!testCases) {
      return res.status(400).json({ success: false, error: 'testCases is required' });
    }

    const script = await generateAutomationScript(testCases);
    return res.json({ success: true, data: { script } });
  } catch (error) {
    console.error('Error generating script:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint: Refine Test Cases
app.post('/refine-testcases', async (req, res) => {
  try {
    const { currentTestCases, instruction } = req.body;
    
    if (!currentTestCases || !instruction) {
      return res.status(400).json({ success: false, error: 'currentTestCases and instruction are required' });
    }

    const refinedTestCases = await refineTestCases(currentTestCases, instruction);
    return res.json({ success: true, data: { testCases: refinedTestCases } });
  } catch (error) {
    console.error('Error refining test cases:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint: Generate from Image
app.post('/generate-from-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'image file is required' });
    }

    // 1. Extract text from image via Vision API
    const extractedText = await extractTextFromImage(req.file.buffer);
    
    if (!extractedText) {
      return res.status(400).json({ success: false, error: 'No text found in the provided image' });
    }

    // 2. Generate test cases from extracted text via Gemini
    const testCasesResult = await generateTestCasesFromText(extractedText);
    
    return res.json({ success: true, data: testCasesResult });
  } catch (error) {
    console.error('Error processing image:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
