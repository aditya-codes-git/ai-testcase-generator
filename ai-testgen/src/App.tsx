import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground"><div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent"></div></div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={session ? <Dashboard session={session} /> : <Navigate to="/auth" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
