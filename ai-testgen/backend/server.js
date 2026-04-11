require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { generateTestCasesFromText } = require('./utils/gemini');
const groq = require('./utils/groq');
const visionRoutes = require('./routes/vision');

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

// Mount Vision Routes
app.use('/', visionRoutes);

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

    const refinedTestCases = await groq.refineTestCases(currentTestCases, instruction);
    return res.json({ success: true, data: { testCases: refinedTestCases } });
  } catch (error) {
    console.error('Error refining test cases:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint: Generate Automation Script
app.post('/generate-testcases', async (req, res) => {
  try {
    const { feature } = req.body;
    if (!feature) {
      return res.status(400).json({ success: false, error: 'feature is required' });
    }
    const result = await groq.generateTestCases(feature);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error generating test cases:', error);
    return res.status(500).json({ success: false, error: error.message });
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
    console.error('Error in chat refinement:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
