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
    console.log("Feature requested:", feature)

    // Ensure feature string exists
    if (!feature || typeof feature !== 'string') {
      throw new Error('Feature description is required')
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      console.warn('GEMINI_API_KEY is not set. Using fallback mock data.');
      return new Response(JSON.stringify(getMockData(feature)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prompt = `Generate software test cases for the following feature: "${feature}"

Return STRICT JSON:
{
"projectName": "Extracted or inferred project name",
"priority": "High/Medium/Low",
"description": "Brief description of the generated tests",
"testCases": [
{
"id": "TC001",
"title": "Short title",
"type": "positive/negative/edge",
"steps": ["Step 1", "Step 2"],
"inputData": "Input values if any",
"expectedResult": "What should happen",
"actualResult": "",
"environment": "Web",
"status": "Not Executed",
"bugSeverity": "Low/Medium/High/Critical or empty",
"bugPriority": "Low/Medium/High/Urgent or empty",
"notes": ""
}
]
}

Rules:
* No extra text, ONLY valid JSON
* At least 6 test cases
* Include positive, negative, and edge cases`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`
    
    console.log("Calling Gemini API...");

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error response:", errText);
      throw new Error('Gemini API call failed')
    }

    const geminiData = await geminiRes.json()
    const textOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!textOutput) {
       throw new Error('Invalid response from Gemini API')
    }
    
    // Attempt to parse JSON safely mapping markdown code blocks if any
    let parsedJson;
    try {
      const cleanJsonStr = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedJson = JSON.parse(cleanJsonStr);
    } catch (parseError) {
      console.error("Failed to parse Gemini output as JSON", textOutput);
      throw new Error('Failed to parse Gemini output as JSON')
    }

    return new Response(JSON.stringify(parsedJson), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error("Error generating test cases:", error.message)
    // Fallback response explicitly requested
    return new Response(JSON.stringify(getMockData("Fallback: " + (error.message || 'Unknown Error'))), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function getMockData(feature: string) {
  return {
    projectName: "Sample App",
    priority: "Medium",
    description: "Generated fallback test cases due to an error.",
    testCases: [
      {
        id: "TC001",
        title: "Verify positive flow",
        type: "positive",
        steps: ["Open app", "Input valid data", "Submit"],
        inputData: feature,
        expectedResult: "Success message displayed",
        actualResult: "",
        environment: "Web",
        status: "Not Executed",
        bugSeverity: "",
        bugPriority: "",
        notes: "Generated from fallback"
      },
      {
        id: "TC002",
        title: "Verify negative flow",
        type: "negative",
        steps: ["Open app", "Input invalid data", "Submit"],
        inputData: "invalid",
        expectedResult: "Error message displayed",
        actualResult: "",
        environment: "Web",
        status: "Not Executed",
        bugSeverity: "",
        bugPriority: "",
        notes: "Generated from fallback"
      }
    ]
  }
}
