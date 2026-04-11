const axios = require('axios');

/* ---------- SAFE JSON PARSER ---------- */
function extractJSON(text) {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    return JSON.parse(text.substring(start, end + 1));
  } catch (e) {
    console.error("❌ RAW AI OUTPUT:", text);
    throw new Error("Invalid JSON from AI");
  }
}

/* ---------- GROQ CALL ---------- */
async function callGroq(messages, temperature = 0.3) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is missing from environment variables');
  }

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: "llama-3.3-70b-versatile",
        messages,
        temperature
        // ✅ NO response_format (IMPORTANT FIX)
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    ```
const content = response.data.choices[0].message.content;

console.log("🔥 GROQ RAW:", content);

return content;
```

  } catch (error) {
    const errorDetail = error.response?.data || error.message;
    console.error('[Groq API Error]:', typeof errorDetail === 'object' ? JSON.stringify(errorDetail) : errorDetail);
    throw new Error('Failed to call Groq API');
  }
}

/* ---------- GENERATE TEST CASES ---------- */
async function generateTestCases(feature) {
  const messages = [
    {
      role: "system",
      content: "You are a professional QA engineer. Return ONLY JSON."
    },
    {
      role: "user",
      content: `
Generate test cases for:

${feature}

RULES:

* 6 to 10 test cases
* Include positive, negative, edge cases
* NO empty fields
* NO "-"
* realistic input values

FORMAT:
{
"projectDetails": {
"projectName": "Sample App",
"priority": "High",
"description": "Feature testing",
"testCaseAuthor": "AI",
"testCaseReviewer": "",
"testCaseVersion": "1.0",
"testExecutionDate": ""
},
"testCases": [
{
"testCaseId": "TC001",
"testSteps": ["Enter username","Enter password","Click login"],
"inputData": "username: user123, password: pass123",
"expectedResult": "Login successful",
"actualResult": "",
"testEnvironment": "Web",
"executionStatus": "Not Executed",
"bugSeverity": "None",
"bugPriority": "None",
"notes": "Positive"
}
]
}`
    }
  ];

  const raw = await callGroq(messages, 0.4);
  const parsed = extractJSON(raw);

  return parsed;
}

/* ---------- CHAT REFINE ---------- */
async function chatRefine(messages, currentTestCases) {
  const groqMessages = [
    {
      role: "system",
      content: "Return JSON with testCases + assistantMessage"
    },
    {
      role: "user",
      content: `
Current:
${JSON.stringify(currentTestCases, null, 2)}

Chat:
${JSON.stringify(messages, null, 2)}
`
    }
  ];

  const raw = await callGroq(groqMessages);
  return extractJSON(raw);
}

/* ---------- REFINE ---------- */
async function refineTestCases(currentTestCases, instruction) {
  const messages = [
    {
      role: "system",
      content: "Return ONLY JSON array"
    },
    {
      role: "user",
      content: `
Refine:

${JSON.stringify(currentTestCases, null, 2)}

Instruction:
${instruction}
`
    }
  ];

  const raw = await callGroq(messages);
  return extractJSON(raw);
}

/* ---------- AUTOMATION SCRIPT ---------- */
async function generateAutomationScript(testCases) {
  const messages = [
    {
      role: "system",
      content: "Generate Java Selenium TestNG code"
    },
    {
      role: "user",
      content: JSON.stringify(testCases, null, 2)
    }
  ];

  const raw = await callGroq(messages, 0.2);

  let clean = raw;
  if (clean.startsWith("`")) {
    clean = clean.replace(/^`[a-z]*\n/, "").replace(/```$/, "");
  }

  return clean.trim();
}

module.exports = {
  generateTestCases,
  chatRefine,
  refineTestCases,
  generateAutomationScript,
  callGroq
};
