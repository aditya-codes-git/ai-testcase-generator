import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { originalPrompt, currentTestCases, instruction } = await req.json()

    if (!currentTestCases || !instruction) {
      throw new Error('Current test cases and refinement instruction are required')
    }

    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY is not configured')
    }

    // Format the current test cases as a readable string for the LLM
    const formattedTestCases = currentTestCases.map((tc: any) => {
      return `Test Case ID: ${tc.testCaseId}
Test Steps: ${tc.testSteps?.join('; ')}
Input Data: ${tc.inputData || 'N/A'}
Expected Result: ${tc.expectedResult || 'N/A'}
Environment: ${tc.testEnvironment || 'Web'}
Status: ${tc.executionStatus || 'Not Executed'}
Notes: ${tc.notes || 'N/A'}`
    }).join('\n---\n')

    const prompt = `You are a Senior QA Automation Engineer with 10+ years of experience in manual testing, automation testing, and test design.

You are highly skilled in:
* Writing production-level test cases
* Identifying edge cases, boundary conditions, and failure scenarios
* Improving test coverage without redundancy
* Converting test cases into structured, automation-ready formats
* Maintaining clarity, precision, and real-world usability

---

### INPUT:

1. ORIGINAL REQUIREMENT:
${originalPrompt || 'Not provided'}

2. CURRENT TEST CASES:
${formattedTestCases}

3. REFINEMENT INSTRUCTION:
${instruction}

---

### YOUR TASK:

Refine and improve the given test cases based on the refinement instruction.

* Carefully analyze the existing test cases
* Apply the instruction intelligently (not blindly)
* Improve logical coverage, depth, and quality
* Ensure all test cases are meaningful and non-repetitive
* Maintain real-world usability

---

### STRICT RULES:

* DO NOT remove valid existing test cases unless explicitly required
* DO NOT duplicate test cases
* DO NOT generate vague or generic test cases
* KEEP everything structured and clean
* ENSURE all steps are clear and executable
* ENSURE expected results are specific and testable

---

### REFINEMENT LOGIC:

* If instruction is about "edge cases": Add boundary values, extreme inputs, empty inputs, null cases
* If instruction is about "negative testing": Add invalid inputs, incorrect flows, error handling scenarios
* If instruction is about "improving coverage": Identify missing logical scenarios and add them
* If instruction is about "automation-ready": Make steps precise, deterministic, and selector-friendly
* If instruction is about "BDD": Convert into Given-When-Then format
* If instruction is custom: Interpret intelligently and apply improvements accordingly

---

### OUTPUT FORMAT (STRICT JSON ONLY):

Return ONLY valid JSON. No explanation. No extra text.

{
  "testCases": [
    {
      "testCaseId": "TC001",
      "testSteps": ["Step 1", "Step 2", "Step 3"],
      "inputData": "",
      "expectedResult": "",
      "actualResult": "",
      "testEnvironment": "Web",
      "executionStatus": "Not Executed",
      "bugSeverity": "None",
      "bugPriority": "None",
      "notes": ""
    }
  ],
  "refinementSummary": "Brief summary of what was changed/added"
}

Return ONLY JSON.`

    const groqUrl = `https://api.groq.com/openai/v1/chat/completions`

    console.log("Calling Groq API for test case refinement...")

    const groqRes = await fetch(groqUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a Senior QA Automation Engineer who outputs strictly valid JSON. You refine and improve test cases based on user instructions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.15,
        response_format: { type: "json_object" }
      })
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text()
      console.error("Groq API error response:", errText)
      throw new Error(`Groq API call failed: ${groqRes.statusText}`)
    }

    const groqData = await groqRes.json()
    const textOutput = groqData.choices?.[0]?.message?.content

    if (!textOutput) {
      throw new Error('Invalid response from Groq API')
    }

    let parsedJson
    try {
      parsedJson = JSON.parse(textOutput)
    } catch (_parseError) {
      console.error("Failed to parse Groq output as JSON", textOutput)
      throw new Error('Failed to parse Groq output as JSON')
    }

    return new Response(JSON.stringify(parsedJson), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error("Error refining test cases:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
