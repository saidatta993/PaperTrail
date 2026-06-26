"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Play } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'

// ── Types ──────────────────────────────────────────────────────────────────

type EvalRun = {
  id:                string
  created_at:        string
  faithfulness:      number
  answer_relevancy:  number
  context_precision: number
  context_recall:    number
}

// ── Score badge ────────────────────────────────────────────────────────────

function ScoreBadge({ value }: { value: number }) {
  const pct = (value * 100).toFixed(1)
  const cls = value >= 0.75 ? 'score-high' : value >= 0.5 ? 'score-mid' : 'score-low'
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums ${cls}`}>
      {pct}%
    </span>
  )
}

// ── PaperTrail Logo (inline) ───────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-2 select-none">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="5"  cy="13" r="2.4" stroke="#F59E0B" strokeWidth="1.8"/>
        <circle cx="12" cy="6"  r="2.4" stroke="#F59E0B" strokeWidth="1.8"/>
        <circle cx="19" cy="13" r="2.4" stroke="#F59E0B" strokeWidth="1.8"/>
        <line x1="7.3"  y1="11.5" x2="9.8"  y2="7.8"  stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="14.2" y1="7.8"  x2="16.7" y2="11.5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <span className="text-lg font-semibold tracking-tight text-[#E2D9C9]">PaperTrail</span>
    </div>
  )
}

// ── Custom tooltip for chart ───────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0F1B2D] border border-[#1E3048] rounded-lg p-3 text-xs shadow-xl">
      <p className="text-[#64748B] mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 mb-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.fill }}/>
            <span className="text-[#94A3B8]">{p.name}</span>
          </span>
          <span className="font-semibold text-[#E2D9C9]">{p.value}%</span>
        </div>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function Evals() {
  const router = useRouter()
  const [session,  setSession]  = useState<any>(null)
  const [runs,     setRuns]     = useState<EvalRun[]>([])
  const [loading,  setLoading]  = useState(true)
  const [running,  setRunning]  = useState(false)
  const [runMsg,   setRunMsg]   = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login')
      else { setSession(session); fetchEvals(session.access_token) }
    })
  }, [router])

  const fetchEvals = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/evals`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setRuns(data.runs.reverse())
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleRunEval = async () => {
    if (!session) return
    setRunning(true); setRunMsg('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/evals/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        setRunMsg('Evaluation complete. Refreshing results…')
        await fetchEvals(session.access_token)
        setTimeout(() => setRunMsg(''), 4000)
      } else {
        const e = await res.json()
        setRunMsg(`Error: ${e.detail || 'Evaluation failed'}`)
      }
    } catch (err: any) {
      setRunMsg(`Error: ${err.message}`)
    } finally { setRunning(false) }
  }

  if (!session || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1B2D]">
      <Loader2 className="animate-spin text-[#F59E0B] w-8 h-8"/>
    </div>
  )

  const latest = runs.length > 0 ? runs[runs.length - 1] : null

  const chartData = runs.map(r => ({
    time:         format(new Date(r.created_at), 'MMM d'),
    Faithfulness: Number((r.faithfulness      * 100).toFixed(1)),
    Relevancy:    Number((r.answer_relevancy  * 100).toFixed(1)),
    Precision:    Number((r.context_precision * 100).toFixed(1)),
    Recall:       Number((r.context_recall    * 100).toFixed(1)),
  }))

  const METRIC_COLS = [
    { key: 'faithfulness',      label: 'Faithfulness',      color: '#F59E0B' },
    { key: 'answer_relevancy',  label: 'Answer Relevancy',  color: '#60A5FA' },
    { key: 'context_precision', label: 'Context Precision', color: '#34D399' },
    { key: 'context_recall',    label: 'Context Recall',    color: '#F472B6' },
  ] as const

  const CHART_COLORS = {
    Faithfulness: '#F59E0B',
    Relevancy:    '#60A5FA',
    Precision:    '#34D399',
    Recall:       '#F472B6',
  }

  return (
    <div className="min-h-screen bg-[#0F1B2D] flex flex-col">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="h-14 px-6 flex items-center justify-between border-b border-[#1E3048]">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-1.5 rounded-md text-[#64748B] hover:text-[#94A3B8] hover:bg-[#162336] transition-all">
            <ArrowLeft size={16}/>
          </Link>
          <Logo/>
        </div>

        <button
          id="run-evaluation-btn"
          onClick={handleRunEval}
          disabled={running}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-md
            bg-[#F59E0B] text-[#0F1B2D] font-semibold hover:bg-[#D97706]
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {running ? <Loader2 size={14} className="animate-spin"/> : <Play size={14}/>}
          {running ? 'Running…' : 'Run Evaluation'}
        </button>
      </nav>

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">

        {/* Page title */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#E2D9C9]">Pipeline Evaluations</h1>
            <p className="text-sm text-[#64748B] mt-0.5">RAGAS metrics across evaluation runs</p>
          </div>
          {runMsg && (
            <p className={`text-sm ${runMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
              {runMsg}
            </p>
          )}
        </div>

        {runs.length === 0 ? (
          <div className="pt-card p-12 text-center">
            <p className="text-[#64748B]">No evaluation runs found.</p>
            <p className="text-sm text-[#3D5A7A] mt-1.5">
              Click <span className="text-[#F59E0B] font-medium">Run Evaluation</span> to generate your first run.
            </p>
          </div>
        ) : (
          <>
            {/* ── Latest metrics ── */}
            {latest && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {METRIC_COLS.map(({ key, label, color }) => (
                  <div key={key} className="pt-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }}/>
                      <p className="text-xs text-[#64748B] font-medium">{label}</p>
                    </div>
                    <p className="text-2xl font-bold text-[#E2D9C9] tabular-nums">
                      {((latest as any)[key] * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-[#3D5A7A] mt-1">Latest run</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Bar chart ── */}
            <div className="pt-card p-5">
              <h2 className="text-sm font-semibold text-[#94A3B8] mb-5">Score Trends</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E3048" vertical={false}/>
                    <XAxis dataKey="time" stroke="#3D5A7A" fontSize={12} tickLine={false} axisLine={false}/>
                    <YAxis stroke="#3D5A7A" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`}/>
                    <Tooltip content={<CustomTooltip/>} cursor={{ fill: 'rgba(255,255,255,0.03)' }}/>
                    <Legend
                      iconType="circle" iconSize={8}
                      formatter={(v) => <span style={{ color: '#94A3B8', fontSize: 12 }}>{v}</span>}
                    />
                    <Bar dataKey="Faithfulness" fill={CHART_COLORS.Faithfulness} radius={[3,3,0,0]}/>
                    <Bar dataKey="Relevancy"    fill={CHART_COLORS.Relevancy}    radius={[3,3,0,0]}/>
                    <Bar dataKey="Precision"    fill={CHART_COLORS.Precision}    radius={[3,3,0,0]}/>
                    <Bar dataKey="Recall"       fill={CHART_COLORS.Recall}       radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── History table ── */}
            <div className="pt-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#1E3048]">
                <h2 className="text-sm font-semibold text-[#94A3B8]">Run History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1E3048]">
                      {['Date', 'Faithfulness', 'Relevancy', 'Precision', 'Recall'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...runs].reverse().map((run, i) => (
                      <tr key={run.id}
                        className={`border-b border-[#1E3048]/50 transition-colors hover:bg-[#162336] ${i === 0 ? 'bg-[#162336]/40' : ''}`}>
                        <td className="px-5 py-3.5 text-[#94A3B8] whitespace-nowrap">
                          {format(new Date(run.created_at), 'MMM d, yyyy · HH:mm')}
                          {i === 0 && <span className="ml-2 text-[10px] bg-[#F59E0B]/12 text-[#F59E0B] border border-[#F59E0B]/25 px-1.5 py-0.5 rounded-full font-semibold">Latest</span>}
                        </td>
                        <td className="px-5 py-3.5"><ScoreBadge value={run.faithfulness}/></td>
                        <td className="px-5 py-3.5"><ScoreBadge value={run.answer_relevancy}/></td>
                        <td className="px-5 py-3.5"><ScoreBadge value={run.context_precision}/></td>
                        <td className="px-5 py-3.5"><ScoreBadge value={run.context_recall}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
