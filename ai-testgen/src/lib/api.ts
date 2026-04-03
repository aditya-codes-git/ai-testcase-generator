import { supabase } from './supabase';

export async function generateTestCases(feature: string) {
  try {
    const { data, error } = await supabase.functions.invoke('generate-testcases', {
      body: { feature }
    });

    if (error) {
      console.error('Error invoking edge function:', error);
      throw new Error(error.message || 'Failed to generate test cases.');
    }

    return data;
  } catch (err: any) {
    console.error('API Error:', err);
    throw err;
  }
}
