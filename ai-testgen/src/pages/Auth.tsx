import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import { BrainCircuit } from 'lucide-react'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const navigate = useNavigate()

  const handleAuth = async (isSignUp: boolean) => {
    try {
      setLoading(true)
      setError(null)
      
      const { error: authError } = isSignUp 
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })

      if (authError) throw authError

      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans">
      <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 hover:opacity-80 transition">
        <BrainCircuit className="w-8 h-8 text-primary" />
        <span className="text-xl font-bold tracking-tight text-foreground">AI TestGen</span>
      </Link>

      <div className="w-full max-w-md p-8 rounded-2xl bg-card border border-border mt-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
          <p className="text-muted-foreground mt-2">Sign in to your account or create a new one</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground text-foreground"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground text-foreground"
              placeholder="••••••••"
            />
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={() => handleAuth(false)}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Sign In'}
            </button>
            <button
              onClick={() => handleAuth(true)}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
