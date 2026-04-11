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
    const { messages, currentTestCases, testCaseId } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Chat messages are required')
    }
    if (!currentTestCases || !Array.isArray(currentTestCases)) {
      throw new Error('Current test cases are required')
    }

    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    
    // Format current test cases for context
    const formattedTestCases = currentTestCases.map((tc: any) => {
      return `[${tc.testCaseId}] Steps: ${tc.testSteps?.join(' → ')} | Input: ${tc.inputData || 'N/A'} | Expected: ${tc.expectedResult || 'N/A'} | Env: ${tc.testEnvironment || 'Web'} | Notes: ${tc.notes || ''}`
    }).join('\n')

    if (!groqApiKey) {
      console.warn('GROQ_API_KEY is not set. Returning current state as mock.');
      return new Response(JSON.stringify({
        testCases: currentTestCases,
        assistantMessage: 'GROQ_API_KEY is missing. Please set it via Supabase secrets.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const groqMessages: Array<{role: string, content: string}> = [
      {
        role: "system",
        content: `You are a Senior QA Automation Engineer with 10+ years of experience. The user will iteratively refine test cases through conversation.

IMPORTANT RULES:
- Always update the test cases based on the latest instruction while preserving ALL previous improvements
- Never remove valid test cases unless explicitly asked
- Keep test case IDs sequential (TC001, TC002...)
- Ensure no duplicates
- Make steps clear and actionable
- Return ONLY valid JSON

CURRENT TEST CASES:
${formattedTestCases}

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "testCases": [
    {
      "testCaseId": "TC001",
      "testSteps": ["Step 1", "Step 2"],
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
  "assistantMessage": "A brief, friendly summary of changes made (1-2 sentences)"
}

Return ONLY JSON.`
      }
    ]

    for (const msg of messages) {
      groqMessages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.role === 'assistant'
          ? `Previous refinement response: ${msg.content}`
          : msg.content
      })
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        temperature: 0.15,
        response_format: { type: "json_object" }
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error:", errText);
      throw new Error(`Groq API call failed: ${groqRes.statusText}`);
    }

    const groqData = await groqRes.json();
    const textOutput = groqData.choices?.[0]?.message?.content;

    if (!textOutput) {
      throw new Error('Invalid response from Groq API');
    }

    const parsedJson = JSON.parse(textOutput);

    return new Response(JSON.stringify({
      testCases: parsedJson.testCases || [],
      assistantMessage: parsedJson.assistantMessage || 'Test cases updated.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Chat refine error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
