import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'


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

      if (!isSignUp) navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard'
        }
      })
      if (authError) throw authError
    } catch (err: any) {
      setError(err.message || 'Google login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 font-sans">
      <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 hover:opacity-80 transition">
        <img src="/Logo/logo_full.png" alt="TestGen" className="h-10 w-auto" />
      </Link>

      <div className="w-full max-w-md p-8 rounded-2xl bg-white/[0.03] border border-white/10 mt-10 backdrop-blur-xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">Welcome back</h2>
          <p className="text-white/40 mt-2">Sign in to your account or create a new one</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full mb-6 flex items-center justify-center gap-3 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-all border border-white/20 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1c-.22-.67-.35-1.39-.35-2.1s.13-1.43.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-black px-2 text-white/30">Or continue with</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/10 focus:border-white/30 focus:ring-1 focus:ring-white/20 outline-none transition-all placeholder:text-white/20 text-white"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/10 focus:border-white/30 focus:ring-1 focus:ring-white/20 outline-none transition-all placeholder:text-white/20 text-white"
              placeholder="••••••••"
            />
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={() => handleAuth(false)}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Sign In'}
            </button>
            <button
              onClick={() => handleAuth(true)}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors disabled:opacity-50 border border-white/10"
            >
              {loading ? 'Processing...' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
