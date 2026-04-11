const axios = require('axios');

async function callGroq(messages, temperature = 0.1, responseFormat = { type: "json_object" }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is missing from environment variables');
  }

  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: "llama-3.3-70b-versatile",
      messages,
      temperature,
      response_format: responseFormat
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    const errorDetail = error.response?.data || error.message;
    console.error('[Groq API Error]:', typeof errorDetail === 'object' ? JSON.stringify(errorDetail) : errorDetail);
    throw new Error('Failed to call Groq API');
  }
}

// Generate test cases from feature description
async function generateTestCases(feature) {
  const systemPrompt = "You are a professional QA engineer who outputs strictly valid JSON.";
  const userPrompt = `You are a professional QA engineer.

Generate structured software test cases based on a feature description.

---

## OUTPUT FORMAT (STRICT JSON ONLY)

Return ONLY valid JSON. No explanation. No extra text.

{
"projectDetails": {
"projectName": "Sample App",
"priority": "High",
"description": "<short description of feature>",
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

* Generate at least 6–10 test cases
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
* JSON must be valid and directly parsable

---

## FEATURE

${feature}

---

Return ONLY JSON.`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  const textOutput = await callGroq(messages);
  return JSON.parse(textOutput);
}

// Chat-based refinement
async function chatRefine(messages, currentTestCases) {
  const systemPrompt = `You are a professional QA assistant. You are refining a set of test cases based on a conversation.
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

  const groqMessages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  const textOutput = await callGroq(groqMessages);
  return JSON.parse(textOutput);
}

// Direct refinement
async function refineTestCases(currentTestCases, instruction) {
  const systemPrompt = `You are a professional QA engineer who outputs strictly valid JSON array of test cases.`;
  const userPrompt = `Refine the given test cases based on the user's instructions.
Output ONLY a raw JSON array of test cases matching this structure:
[
  {
    "testCaseId": "TC001",
    "testSteps": ["step1", "step2"],
    "inputData": "value",
    "expectedResult": "result",
    "notes": "notes"
  }
]

CURRENT TEST CASES:
${JSON.stringify(currentTestCases, null, 2)}

INSTRUCTION:
${instruction}`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  const textOutput = await callGroq(messages);
  return JSON.parse(textOutput);
}

// Generate an automation script
async function generateAutomationScript(testCases) {
  const systemPrompt = `You are a senior QA Automation Engineer specializing in Java Selenium and TestNG. Convert test cases into clean, executable automation scripts.

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

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  // We set responseFormat to null because we want raw text (Java code), not a JSON object
  const textOutput = await callGroq(messages, 0.2, null);
  
  // Clean up markdown block if the model included it despite instructions
  let cleanScript = textOutput;
  if (cleanScript.startsWith("```")) {
    cleanScript = cleanScript.replace(/^```[a-z]*\n/, "").replace(/```$/, "");
  }
  
  return cleanScript.trim();
}

module.exports = {
  generateTestCases,
  chatRefine,
  refineTestCases,
  generateAutomationScript,
  callGroq
};
