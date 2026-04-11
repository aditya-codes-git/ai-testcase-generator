import { supabase } from './supabase';
import type { TestCase } from '../components/ui/TestCaseTable';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export async function generateTestCases(feature: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-testcases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ feature })
    });

    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error || 'Failed to generate test cases.');
    }

    return body.data;
  } catch (err: any) {
    console.error('API Error:', err);
    throw err;
  }
}

export async function refineTestCases(
  currentTestCases: TestCase[],
  instruction: string
) {
  try {
    const response = await fetch(`${API_BASE_URL}/refine-testcases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ currentTestCases, instruction })
    });

    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error || 'Failed to refine test cases.');
    }

    return body.data;
  } catch (err: any) {
    console.error('Refine API Error:', err);
    throw err;
  }
}

export async function chatRefine(
  messages: ChatMessage[],
  currentTestCases: TestCase[],
  testCaseId?: string
) {
  try {
    const response = await fetch(`${API_BASE_URL}/chat-refine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages, currentTestCases, testCaseId })
    });

    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error || 'Failed to refine test cases via chat.');
    }

    return body.data as {
      testCases: TestCase[];
      assistantMessage: string;
    };
  } catch (err: any) {
    console.error('Chat Refine API Error:', err);
    throw err;
  }
}

// Persist chat messages to Supabase
export async function saveChatMessage(
  testCaseId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  version: number
) {
  const { error } = await supabase.from('chat_messages').insert({
    test_case_id: testCaseId,
    user_id: userId,
    role,
    content,
    version
  });
  if (error) console.warn('Failed to save chat message:', error);
}

// Load chat messages for a report
export async function loadChatMessages(testCaseId: string) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('test_case_id', testCaseId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('Failed to load chat messages:', error);
    return [];
  }

  return (data || []).map((msg: any) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    timestamp: msg.created_at,
    version: msg.version
  }));
}

export async function generateAutomationScript(
  testCaseId: string,
  testCases: TestCase[],
  version: number = 1,
  language: string = 'java',
  framework: string = 'selenium-testng'
) {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ testCases, language, framework })
    });

    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error || 'Failed to generate automation script.');
    }

    const script = body.data.script;
    
    // Save generated script to Supabase
    const { error: dbError } = await supabase.from('test_case_scripts').upsert({
      test_case_id: testCaseId,
      version: version,
      script_content: script
    }, { onConflict: 'test_case_id,version' });
    
    if (dbError) {
      console.error('Failed to save script to database:', dbError);
    }

    return { script, version };
  } catch (err: any) {
    console.error('Generate Script API Error:', err);
    throw err;
  }
}

export async function fetchAutomationScript(testCaseId: string, version?: number) {
  let query = supabase
    .from('test_case_scripts')
    .select('*')
    .eq('test_case_id', testCaseId)
    .order('version', { ascending: false })
    .limit(1);

  if (version !== undefined) {
    query = supabase
      .from('test_case_scripts')
      .select('*')
      .eq('test_case_id', testCaseId)
      .eq('version', version)
      .limit(1);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('Failed to load automation script:', error);
    return null;
  }
  return data?.[0] || null;
}

// Vision API implementation
export async function generateFromImage(imageFile: File) {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`${API_BASE_URL}/generate-from-image`, {
      method: 'POST',
      body: formData
    });

    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error || 'Failed to generate test cases from image.');
    }

    return body.data;
  } catch (err: any) {
    console.error('Vision API Error:', err);
    throw err;
  }
}
