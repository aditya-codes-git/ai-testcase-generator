const fs = require('fs');
const path = require('path');

// 1. Load environment variables conditionally for local development
if (fs.existsSync(path.join(__dirname, '.env'))) {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { generateTestCasesFromText } = require('./utils/gemini');
const groq = require('./utils/groq');
const visionRoutes = require('./routes/vision');

// 2. Environment Variable Validation (Fail-fast at startup)
const REQUIRED_ENV_VARS = ['GROQ_API_KEY', 'GEMINI_API_KEY'];
const missingVars = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

if (missingVars.length > 0) {
  console.warn(`Missing env vars: ${missingVars.join(', ')}`);
}

const app = express();
const PORT = process.env.PORT || 8080;

// Configuration
app.use(cors());
app.use(express.json());

// Set up multer for handling multipart/form-data (image uploads)
const upload = multer({ storage: multer.memoryStorage() });

// 3. Root Health Route (GCP Default Probes)
app.get('/', (req, res) => {
  res.send('Backend running');
});

// 4. Robust Health Check (Detailed)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    status: 'UP',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      groq: !!process.env.GROQ_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY
    }
  });
});

// Mount Vision Routes
app.use('/', visionRoutes);

// Generic Response Wrapper for Errors
const handleError = (res, error, message) => {
  console.error(`[ERROR] ${message}:`, error.message || error);
  res.status(500).json({ 
    success: false, 
    error: message, 
    details: process.env.NODE_ENV === 'development' ? error.message : undefined 
  });
};

// Endpoint: Generate Automation Script
app.post('/generate-script', async (req, res) => {
  try {
    const { testCases } = req.body;
    if (!testCases) {
      return res.status(400).json({ success: false, error: 'testCases is required' });
    }
    const script = await groq.generateAutomationScript(testCases);
    return res.json({ success: true, data: { script } });
  } catch (error) {
    handleError(res, error, 'Error generating script');
  }
});

// Endpoint: Refine Test Cases
app.post('/refine-testcases', async (req, res) => {
  try {
    const { currentTestCases, instruction } = req.body;
    if (!currentTestCases || !instruction) {
      return res.status(400).json({ success: false, error: 'currentTestCases and instruction are required' });
    }
    const refinedTestCases = await groq.refineTestCases(currentTestCases, instruction);
    return res.json({ success: true, data: { testCases: refinedTestCases } });
  } catch (error) {
    handleError(res, error, 'Error refining test cases');
  }
});

// Endpoint: Generate Test Cases
app.post('/generate-testcases', async (req, res) => {
  try {
    const { feature } = req.body;
    if (!feature) {
      return res.status(400).json({ success: false, error: 'feature is required' });
    }
    const result = await groq.generateTestCases(feature);
    return res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'Error generating test cases');
  }
});

// Endpoint: Chat Refinement
app.post('/chat-refine', async (req, res) => {
  try {
    const { messages, currentTestCases } = req.body;
    if (!messages || !currentTestCases) {
      return res.status(400).json({ success: false, error: 'messages and currentTestCases are required' });
    }
    const result = await groq.chatRefine(messages, currentTestCases);
    return res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'Error in chat refinement');
  }
});

app.listen(PORT, () => {
  console.log(`\x1b[32m%s\x1b[0m`, `>>> TestGen AI Backend is running on port ${PORT}`);
  console.log(`>>> Health check available at http://localhost:${PORT}/health`);
});
