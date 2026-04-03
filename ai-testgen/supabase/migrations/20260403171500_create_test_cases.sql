CREATE TABLE IF NOT EXISTS public.test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feature_text TEXT NOT NULL,
  generated_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own test cases' AND tablename = 'test_cases') THEN
    CREATE POLICY "Users can view their own test cases" ON public.test_cases FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own test cases' AND tablename = 'test_cases') THEN
    CREATE POLICY "Users can insert their own test cases" ON public.test_cases FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
