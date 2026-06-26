"use client"
import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock } from 'lucide-react'

// ── Inline PaperTrail Logo ─────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center justify-center gap-2.5 select-none">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="5" cy="13" r="2.4" stroke="#F59E0B" strokeWidth="1.8" />
        <circle cx="12" cy="6" r="2.4" stroke="#F59E0B" strokeWidth="1.8" />
        <circle cx="19" cy="13" r="2.4" stroke="#F59E0B" strokeWidth="1.8" />
        <line x1="7.3" y1="11.5" x2="9.8" y2="7.8" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14.2" y1="7.8" x2="16.7" y2="11.5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="text-2xl font-semibold tracking-tight text-[#E2D9C9]">PaperTrail</span>
    </div>
  )
}

// ── Login page ─────────────────────────────────────────────────────────────

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const router = useRouter()

  const handleAuth = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    setError(null)
    try {
      const { error } = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
      if (error) throw error
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAuth()
  }

  return (
    <div className="min-h-screen bg-[#0F1B2D] flex">

      {/* ── Left decorative panel ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 border-r border-[#1E3048]">
        <Logo />

        <div className="space-y-5">
          <p className="text-xs font-semibold text-[#3D5A7A] uppercase tracking-widest">
            What you can do
          </p>

          {[
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12h6M9 16h6M9 8h6M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"
                    stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              ),
              title: 'Chat with your papers',
              desc:  'Ask research questions and get grounded answers from your uploaded PDFs.',
            },
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 6v6l4 2" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="9" stroke="#F59E0B" strokeWidth="1.6"/>
                </svg>
              ),
              title: 'Citation lookup',
              desc:  'Instantly fetch metadata for any paper referenced in your documents.',
            },
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="#F59E0B" strokeWidth="1.6"/>
                  <path d="M20 20l-3-3" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              ),
              title: 'Live web search',
              desc:  'Augment answers with up-to-date information from the open web.',
            },
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 17l4-8 4 5 3-3 4 6" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
              title: 'Pipeline evaluation',
              desc:  'Track RAGAS metrics — faithfulness, relevancy, precision and recall.',
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="mt-0.5 w-7 h-7 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20
                flex items-center justify-center flex-shrink-0">
                {icon}
              </div>
              <div>
                <p className="text-sm font-medium text-[#C8C0B4]">{title}</p>
                <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-[#3D5A7A]">
          Chat with your research papers using retrieval-augmented generation.
        </p>
      </div>

      {/* ── Right: login card ───────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">

          {/* Logo (mobile only) */}
          <div className="lg:hidden">
            <Logo />
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-xl font-semibold text-[#E2D9C9]">
              {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
            </h1>
            <p className="text-sm text-[#64748B] mt-1">
              {mode === 'login'
                ? 'Welcome back. Enter your credentials to continue.'
                : 'Start your research journey today.'}
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/8 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <div className="space-y-4" onKeyDown={handleKeyDown}>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium text-[#64748B] uppercase tracking-widest">
                Email
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3D5A7A] pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full bg-[#162336] border border-[#1E3048] rounded-lg pl-9 pr-4 py-2.5
                    text-sm text-[#E2D9C9] placeholder-[#3D5A7A]
                    focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/20
                    transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-[#64748B] uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3D5A7A] pointer-events-none" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full bg-[#162336] border border-[#1E3048] rounded-lg pl-9 pr-4 py-2.5
                    text-sm text-[#E2D9C9] placeholder-[#3D5A7A]
                    focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/20
                    transition-colors"
                />
              </div>
            </div>

            {/* Primary action */}
            <button
              id="auth-submit-btn"
              onClick={handleAuth}
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-lg bg-[#F59E0B] text-[#0F1B2D] text-sm font-semibold
                hover:bg-[#D97706] disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
                : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>

          {/* Mode toggle */}
          <p className="text-center text-sm text-[#64748B]">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(null) }}
              className="text-[#F59E0B] hover:text-[#D97706] font-medium transition-colors"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

        </div>
      </div>
    </div>
  )
}
