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
    const { feature } = await req.json()
    console.log("Feature requested via Groq:", feature)

    if (!feature || typeof feature !== 'string') {
      throw new Error('Feature description is required')
    }

    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      console.warn('GROQ_API_KEY is not set. Using fallback mock data.');
      return new Response(JSON.stringify(getMockData(feature)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prompt = `You are a professional QA engineer.

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

    const groqUrl = `https://api.groq.com/openai/v1/chat/completions`
    
    console.log("Calling Groq API (llama-3.3-70b-versatile)...");

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
            content: "You are a professional QA engineer who outputs strictly valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error response:", errText);
      throw new Error(`Groq API call failed: ${groqRes.statusText}`)
    }

    const groqData = await groqRes.json()
    const textOutput = groqData.choices?.[0]?.message?.content

    if (!textOutput) {
       throw new Error('Invalid response from Groq API')
    }
    
    let parsedJson;
    try {
      parsedJson = JSON.parse(textOutput);
    } catch (parseError) {
      console.error("Failed to parse Groq output as JSON", textOutput);
      throw new Error('Failed to parse Groq output as JSON')
    }

    return new Response(JSON.stringify(parsedJson), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error("Error generating test cases via Groq:", error.message)
    return new Response(JSON.stringify(getMockData("Fallback: " + (error.message || 'Unknown Error'))), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function getMockData(feature: string) {
  return {
    projectDetails: {
      projectName: "Fallback Tool",
      priority: "Medium",
      description: "Generated fallback test cases due to a backend error.",
      testCaseAuthor: "System",
      testCaseReviewer: "N/A",
      testCaseVersion: "0.1",
      testExecutionDate: ""
    },
    testCases: [
      {
        testCaseId: "TC001",
        testSteps: ["Open app", "Input valid data", "Submit"],
        inputData: feature,
        expectedResult: "Success message displayed",
        actualResult: "",
        testEnvironment: "Web",
        executionStatus: "Not Executed",
        bugSeverity: "None",
        bugPriority: "None",
        notes: "Generated from fallback"
      }
    ]
  }
}
