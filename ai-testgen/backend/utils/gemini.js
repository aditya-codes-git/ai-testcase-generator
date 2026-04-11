const { GoogleGenerativeAI } = require('@google/generative-ai');

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing from environment variables');
  }
  return new GoogleGenerativeAI(apiKey);
}

// Generate an automation script
async function generateAutomationScript(testCases) {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  const systemInstruction = `You are a senior QA Automation Engineer specializing in Java Selenium and TestNG. Convert test cases into clean, executable automation scripts.

INSTRUCTIONS:
* Convert test cases into Java Selenium code
* Use TestNG framework
* Use proper class structure
* Use meaningful method names
* Use WebDriver (ChromeDriver)
* Include setup and teardown
* Include assertions
* Use By locators (id/name/xpath where appropriate)
* Keep code clean and runnable
* One test method per test case

OUTPUT FORMAT:
* Complete Java class
* Ready to run in IDE
* No explanations, ONLY the raw Java code block without Markdown syntax. Start immediately with 'import' or 'package'.`;

  const userPrompt = `TEST CASES:\n${JSON.stringify(testCases, null, 2)}\n\nPlease generate the automation script according to the instructions. Ensure the output contains only Java code.`;

  const result = await model.generateContent([
    { text: systemInstruction },
    { text: userPrompt }
  ]);

  let textOutput = result.response.text();
  if (textOutput.startsWith("```")) {
    textOutput = textOutput.replace(/^```[a-z]*\n/, "").replace(/```$/, "");
  }

  return textOutput.trim();
}

// Refine test cases
async function refineTestCases(currentTestCases, instruction) {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const systemPrompt = `You are a QA automation expert. Refine the given test cases based on the user's instructions.
Output ONLY a raw JSON array of test cases matching this structure, with no markdown formatting:
[
  {
    "testCaseId": "TC001",
    "testSteps": ["step1", "step2"],
    "inputData": "value",
    "expectedResult": "result",
    "notes": "notes"
  }
]`;

  const userPrompt = `CURRENT TEST CASES:\n${JSON.stringify(currentTestCases, null, 2)}\n\nINSTRUCTION:\n${instruction}`;

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: userPrompt }
  ]);

  let textOutput = result.response.text();
  if (textOutput.startsWith("```")) {
    textOutput = textOutput.replace(/^```[a-z]*\n/, "").replace(/```$/, "");
  }

  try {
    return JSON.parse(textOutput.trim());
  } catch (err) {
    throw new Error('Failed to parse refined test cases as JSON: ' + err.message);
  }
}

// Format extracted text into test cases
async function generateTestCasesFromText(extractedText) {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  const systemPrompt = `You are an expert QA Engineer. Extract test cases from the provided raw text (which was OCR'd from an image).
Output ONLY a raw JSON format exactly following this structure, no markdown:
{
  "projectDetails": {
    "projectName": "Image Feature Extraction",
    "priority": "High",
    "description": "Test cases derived from visual input",
    "testCaseAuthor": "AI Assistant"
  },
  "testCases": [
    {
      "testCaseId": "TC001",
      "testSteps": ["Step 1", "Step 2"],
      "inputData": "Input values",
      "expectedResult": "Expected outcome",
      "notes": "Any other context"
    }
  ]
}`;

  const userPrompt = `RAW TEXT EXTRACTED FROM IMAGE:\n${extractedText}`;

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: userPrompt }
  ]);

  let textOutput = result.response.text();
  if (textOutput.startsWith("```")) {
    textOutput = textOutput.replace(/^```[a-z]*\n/, "").replace(/```$/, "");
  }

  try {
    return JSON.parse(textOutput.trim());
  } catch (err) {
    throw new Error('Failed to parse test cases as JSON: ' + err.message);
  }
}

// Generate test cases from feature description
async function generateTestCases(feature) {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const systemPrompt = `You are an expert QA Engineer. Generate comprehensive test cases for the following feature.
Output ONLY a raw JSON format exactly following this structure, no markdown:
{
  "projectDetails": {
    "projectName": "New Feature Test",
    "priority": "Medium",
    "description": "Auto-generated tests",
    "testCaseAuthor": "AI Assistant"
  },
  "testCases": [
    {
      "testCaseId": "TC001",
      "testSteps": ["Step 1", "Step 2"],
      "inputData": "N/A",
      "expectedResult": "Success",
      "notes": ""
    }
  ]
}`;

  const userPrompt = `FEATURE DESCRIPTION:\n${feature}`;

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: userPrompt }
  ]);

  let textOutput = result.response.text();
  if (textOutput.startsWith("```")) {
    textOutput = textOutput.replace(/^```[a-z]*\n/, "").replace(/```$/, "");
  }

  try {
    return JSON.parse(textOutput.trim());
  } catch (err) {
    throw new Error('Failed to parse generated test cases as JSON: ' + err.message);
  }
}

// Chat-based refinement
async function chatRefine(messages, currentTestCases) {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const systemPrompt = `You are a helpful QA assistant. You are refining a set of test cases based on a conversation.
Respond with a JSON object containing two fields:
1. "testCases": The updated list of test cases (same structure as input).
2. "assistantMessage": A brief, professional explanation of the changes made.

Structure:
{
  "testCases": [...],
  "assistantMessage": "..."
}

No markdown, just raw JSON.`;

  const userPrompt = `CURRENT TEST CASES:\n${JSON.stringify(currentTestCases, null, 2)}\n\nCONVERSATION HISTORY:\n${JSON.stringify(messages, null, 2)}`;

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: userPrompt }
  ]);

  let textOutput = result.response.text();
  if (textOutput.startsWith("```")) {
    textOutput = textOutput.replace(/^```[a-z]*\n/, "").replace(/```$/, "");
  }

  try {
    return JSON.parse(textOutput.trim());
  } catch (err) {
    throw new Error('Failed to parse chat refinement as JSON: ' + err.message);
  }
}

module.exports = {
  generateAutomationScript,
  refineTestCases,
  generateTestCasesFromText,
  generateTestCases,
  chatRefine
};
