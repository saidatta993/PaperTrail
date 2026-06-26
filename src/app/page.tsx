"use client"
import { useState, useEffect, useRef, DragEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  UploadCloud, FileText, X, Send, BookOpen, Globe,
  Loader2, ChevronDown, ChevronUp, User, LogOut,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

type Doc = { id: string; filename: string; created_at: string }
type ChunkSource = { source: string; page: number }
type CitationSource = { title?: string; year?: number; abstract?: string; authors?: string[]; error?: string }
type WebSource = { title?: string; url?: string; body?: string }
type Sources = { chunks: ChunkSource[]; citations: CitationSource[]; web: WebSource[] }

type Message = {
  role: 'user' | 'assistant'
  content: string
  citations?: ChunkSource[]
  sources?: Sources
  toolCallsMade?: string[]
  iterations?: number
}

// ── PaperTrail Logo ────────────────────────────────────────────────────────

function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 18 : size === 'lg' ? 28 : 22
  const textCls = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg'
  return (
    <div className="flex items-center gap-2 select-none">
      <svg width={dim} height={dim} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="5" cy="13" r="2.4" stroke="#F59E0B" strokeWidth="1.8" />
        <circle cx="12" cy="6" r="2.4" stroke="#F59E0B" strokeWidth="1.8" />
        <circle cx="19" cy="13" r="2.4" stroke="#F59E0B" strokeWidth="1.8" />
        <line x1="7.3" y1="11.5" x2="9.8" y2="7.8" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14.2" y1="7.8" x2="16.7" y2="11.5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className={`font-semibold tracking-tight text-[#E2D9C9] ${textCls}`}>
        PaperTrail
      </span>
    </div>
  )
}

// ── Typing indicator ───────────────────────────────────────────────────────

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-0.5">
      {[0, 1, 2].map(i => (
        <span key={i} className="pt-dot w-1.5 h-1.5 rounded-full bg-[#B0A898]"
          style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </span>
  )
}

// ── Sources panel ──────────────────────────────────────────────────────────

function Sources({ msg, expanded, onToggle }: {
  msg: Message; expanded: boolean; onToggle: () => void
}) {
  const hasAgent = msg.sources && (msg.sources.chunks.length + msg.sources.citations.length + msg.sources.web.length > 0)
  const hasLegacy = msg.citations && msg.citations.length > 0
  if (!hasAgent && !hasLegacy) return null

  const pillCls = 'inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-[#F0EBE0] border border-[#DDD5C8] text-[#5C5246]'

  return (
    <div className="mt-3 pt-3 border-t border-[#E8E2D8]">
      <button onClick={onToggle}
        className="flex items-center gap-1.5 text-[11px] text-[#B0A898] hover:text-[#8B8070] transition-colors mb-2 font-medium">
        {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        Sources
        {msg.toolCallsMade && msg.toolCallsMade.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#F59E0B]/12 border border-[#F59E0B]/25 text-[#D97706] text-[10px] font-semibold">
            {msg.toolCallsMade.map(t => t === 'lookup_citation' ? 'Citation' : 'Web').join(' · ')}
          </span>
        )}
        {msg.iterations !== undefined && (
          <span className="text-[#C8C0B4] text-[10px]">{msg.iterations} iter.</span>
        )}
      </button>

      {expanded && (
        <div className="space-y-2.5">
          {/* Agent structured sources */}
          {msg.sources && (<>
            {msg.sources.chunks.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#B0A898] mb-1.5 font-semibold">Paper chunks</p>
                <div className="flex flex-wrap gap-1.5">
                  {msg.sources.chunks.map((c, i) => (
                    <span key={i} className={pillCls}>
                      <FileText size={10} className="text-[#F59E0B]" />{c.source} (p.{c.page})
                    </span>
                  ))}
                </div>
              </div>
            )}
            {msg.sources.citations.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#B0A898] mb-1.5 font-semibold">Citation lookup</p>
                <div className="flex flex-wrap gap-1.5">
                  {msg.sources.citations.map((c, i) => (
                    <span key={i} title={c.abstract} className={pillCls}>
                      <BookOpen size={10} className="text-[#F59E0B]" />
                      {c.title ?? 'Unknown'}{c.year ? ` (${c.year})` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {msg.sources.web.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#B0A898] mb-1.5 font-semibold">Web results</p>
                <div className="flex flex-wrap gap-1.5">
                  {msg.sources.web.map((r, i) => (
                    <a key={i} href={r.url} target="_blank" rel="noreferrer" title={r.body}
                      className={`${pillCls} hover:border-[#F59E0B]/40 transition-colors cursor-pointer`}>
                      <Globe size={10} className="text-[#F59E0B]" />
                      {r.title ?? r.url ?? 'Web result'}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>)}

          {/* Legacy RAG citations */}
          {msg.citations && msg.citations.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#B0A898] mb-1.5 font-semibold">Paper chunks</p>
              <div className="flex flex-wrap gap-1.5">
                {msg.citations.map((c, i) => (
                  <span key={i} className={pillCls}>
                    <FileText size={10} className="text-[#F59E0B]" />{c.source} (p.{c.page})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main app ───────────────────────────────────────────────────────────────

export default function PaperTrailApp() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)

  // Library
  const [documents, setDocuments] = useState<Doc[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)

  // Upload
  const [showDrop, setShowDrop] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Chat
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [agentStatus, setAgentStatus] = useState('')
  const [citationEnabled, setCitationEnabled] = useState(false)
  const [webEnabled, setWebEnabled] = useState(false)
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  // ── Auth ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login')
      else { setSession(session); fetchDocs(session.access_token) }
    })
  }, [router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])


  // ── Documents ─────────────────────────────────────────────────────────────

  const fetchDocs = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) { const d = await res.json(); setDocuments(d.documents || []) }
    } catch (e) { console.error(e) }
    finally { setLoadingDocs(false) }
  }

  const handleUpload = async () => {
    if (!uploadFile || !session) return
    setUploading(true); setUploadMsg('')
    const fd = new FormData(); fd.append('file', uploadFile)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Upload failed')
      setUploadMsg('Ingested successfully!')
      setUploadFile(null); setShowDrop(false)
      fetchDocs(session.access_token)
      setTimeout(() => setUploadMsg(''), 3500)
    } catch (err: any) { setUploadMsg(`Error: ${err.message}`) }
    finally { setUploading(false) }
  }

  const handleDelete = async (doc: Doc, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!session) return
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/${doc.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (selectedDoc?.id === doc.id) setSelectedDoc(null)
      fetchDocs(session.access_token)
    } catch (e) { console.error(e) }
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────

  const onDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)
  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.type === 'application/pdf') setUploadFile(f)
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  const isAgentMode = citationEnabled || webEnabled

  const enabledTools = () => {
    const t: string[] = []
    if (citationEnabled) t.push('lookup_citation')
    if (webEnabled) t.push('web_search')
    return t
  }

  const sendRag = async (userMsg: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ query: userMsg }),
    })
    if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Chat failed') }
    const reader = res.body?.getReader()
    if (!reader) return
    const dec = new TextDecoder(); let buf = ''; let done = false
    while (!done) {
      const { done: sd, value } = await reader.read()
      if (sd) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n'); buf = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') { done = true; break }
        try {
          const p = JSON.parse(raw)
          if (p.token) {
            setMessages(prev => {
              const m = [...prev]
              m[m.length - 1] = { ...m[m.length - 1], content: m[m.length - 1].content + p.token }
              return m
            })
          } else if (Array.isArray(p)) {
            setMessages(prev => {
              const m = [...prev]; m[m.length - 1] = { ...m[m.length - 1], citations: p }; return m
            })
          }
        } catch { /* ignore */ }
      }
    }
  }

  const sendAgent = async (userMsg: string) => {
    setAgentStatus('Researching…')
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ query: userMsg, enabled_tools: enabledTools() }),
    })
    if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Agent chat failed') }
    const data = await res.json()
    setAgentStatus('')
    setMessages(prev => {
      const m = [...prev]
      m[m.length - 1] = {
        ...m[m.length - 1],
        content: data.answer, sources: data.sources,
        toolCallsMade: data.tool_calls_made, iterations: data.iterations,
      }
      return m
    })
  }

  const handleSend = async () => {
    if (!input.trim() || !session) return
    const userMsg = input; setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsTyping(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])
    try {
      if (isAgentMode) await sendAgent(userMsg)
      else await sendRag(userMsg)
    } catch (err: any) {
      setAgentStatus('')
      setMessages(prev => { const m = [...prev]; m[m.length - 1].content = `Error: ${err.message}`; return m })
    } finally { setIsTyping(false) }
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1B2D]">
      <Loader2 className="animate-spin text-[#F59E0B] w-8 h-8" />
    </div>
  )

  const initial = session.user?.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <div className="h-screen flex flex-col bg-[#0F1B2D] overflow-hidden">

      {/* ── Top Nav ─────────────────────────────────────────────────────── */}
      <nav className="flex-shrink-0 h-14 px-6 flex items-center justify-between border-b border-[#1E3048]">
        <Logo />
        <div className="flex items-center gap-6">
          {/* <Link href="/evals"
            className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors tracking-wide">
            Evaluations
          </Link> */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#162336] border border-[#1E3048]
              flex items-center justify-center text-xs font-semibold text-[#94A3B8]">
              {initial}
            </div>
            <button onClick={handleSignOut} title="Sign out"
              className="p-1.5 rounded-md text-[#64748B] hover:text-[#94A3B8] hover:bg-[#162336] transition-all">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ════════════════════════════════════════════════════════════════
            LEFT PANEL — Paper Library
        ════════════════════════════════════════════════════════════════ */}
        <aside className="w-[20%] flex-shrink-0 flex flex-col border-r border-[#1E3048]">

          {/* Panel header */}
          <div className="px-4 py-3 border-b border-[#1E3048] flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#64748B] uppercase tracking-widest">Library</h2>
            <button id="upload-paper-btn"
              onClick={() => setShowDrop(v => !v)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md
                bg-[#F59E0B] text-[#0F1B2D] font-semibold hover:bg-[#D97706] transition-colors">
              <UploadCloud size={13} /> Upload Paper
            </button>
          </div>

          {/* Drop zone */}
          {showDrop && (
            <div className="px-4 py-3 border-b border-[#1E3048] space-y-2 bg-[#0D1624]">
              <div
                id="dropzone"
                onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer rounded-lg border-2 border-dashed px-4 py-5 text-center transition-all ${isDragging ? 'border-[#F59E0B] bg-[#F59E0B]/5' : 'border-[#1E3048] hover:border-[#2A4060]'
                  }`}>
                <input ref={fileRef} type="file" accept=".pdf" className="sr-only"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                <UploadCloud size={20} className={`mx-auto mb-1.5 ${isDragging ? 'text-[#F59E0B]' : 'text-[#3D5A7A]'}`} />
                {uploadFile ? (
                  <p className="text-sm text-[#94A3B8] truncate px-2">{uploadFile.name}</p>
                ) : (
                  <p className="text-sm text-[#3D5A7A]">
                    Drop PDF or <span className="text-[#F59E0B]">browse</span>
                  </p>
                )}
              </div>
              {uploadFile && (
                <button onClick={handleUpload} disabled={uploading}
                  className="w-full py-2 rounded-md bg-[#F59E0B] text-[#0F1B2D] text-sm font-semibold
                    hover:bg-[#D97706] disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                  {uploading
                    ? <><Loader2 size={13} className="animate-spin" /> Ingesting…</>
                    : 'Ingest Paper'}
                </button>
              )}
              {uploadMsg && (
                <p className={`text-xs text-center py-1 ${uploadMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'
                  }`}>{uploadMsg}</p>
              )}
            </div>
          )}

          {/* Document list */}
          <div className="flex-1 overflow-y-auto">
            {loadingDocs ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 className="animate-spin text-[#3D5A7A] w-5 h-5" />
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#162336] border border-[#1E3048]
                  flex items-center justify-center">
                  <FileText size={18} className="text-[#3D5A7A]" />
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">No papers yet.</p>
                  <p className="text-xs text-[#3D5A7A] mt-1">Upload a PDF to get started.</p>
                </div>
              </div>
            ) : (
              <div className="p-3 space-y-0.5">
                {documents.map(doc => (
                  <div key={doc.id}
                    className="w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-2.5 border border-transparent">
                    <FileText size={14} className="flex-shrink-0 mt-0.5 text-[#3D5A7A]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-[#94A3B8]">
                        {doc.filename}
                      </p>
                      <p className="text-[11px] text-[#3D5A7A] mt-0.5">
                        {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <button
                      onClick={e => handleDelete(doc, e)}
                      title="Remove"
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded
                          hover:bg-[#1E3048] text-[#64748B] hover:text-red-400 transition-all mt-0.5">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ════════════════════════════════════════════════════════════════
            RIGHT PANEL — Chat
        ════════════════════════════════════════════════════════════════ */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#F5F0E8]">

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {documents.length === 0 && !loadingDocs ? (
              <div className="flex flex-col items-center justify-center h-full pb-10 gap-4">
                <Logo size="lg" />
                <p className="text-[#8B8070] text-sm max-w-xs text-center leading-relaxed">
                  Upload a PDF to your library to start your research conversation.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full pb-10">
                <p className="text-[#8B8070] text-sm">Ask anything about your papers</p>
                <p className="text-[#B0A898] text-xs mt-1">
                  Enable Citation Lookup or Web Search below for deeper research
                </p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                  {/* Assistant avatar */}
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-[#0F1B2D] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle cx="5" cy="13" r="2.4" stroke="#F59E0B" strokeWidth="2" />
                        <circle cx="12" cy="6" r="2.4" stroke="#F59E0B" strokeWidth="2" />
                        <circle cx="19" cy="13" r="2.4" stroke="#F59E0B" strokeWidth="2" />
                        <line x1="7.3" y1="11.5" x2="9.8" y2="7.8" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="14.2" y1="7.8" x2="16.7" y2="11.5" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user'
                    ? 'bg-[#0F1B2D] text-[#E2D9C9] rounded-tr-sm'
                    : 'bg-white text-[#2C2820] rounded-tl-sm border border-[#E8E2D8]'
                    }`}>

                    {/* Typing / agent status */}
                    {msg.role === 'assistant' && msg.content === '' && isTyping && (
                      agentStatus
                        ? <span className="text-xs text-[#8B8070] italic">{agentStatus}</span>
                        : <TypingDots />
                    )}

                    {/* Content */}
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none
                        prose-p:my-1 prose-p:leading-relaxed
                        prose-headings:text-[#1A2B3C] prose-headings:font-semibold
                        prose-headings:mt-3 prose-headings:mb-1
                        prose-strong:text-[#1A2B3C] prose-strong:font-semibold
                        prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5
                        prose-code:bg-[#F0EBE0] prose-code:px-1.5 prose-code:rounded
                        prose-code:text-[#8B4513] prose-code:text-[12px] prose-code:font-normal
                        prose-a:text-[#D97706] prose-a:no-underline hover:prose-a:underline
                        prose-blockquote:border-[#F59E0B] prose-blockquote:text-[#8B8070]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    )}

                    {/* Sources */}
                    {msg.role === 'assistant' && msg.content && (
                      <Sources
                        msg={msg}
                        expanded={!!expandedSources[i]}
                        onToggle={() => setExpandedSources(p => ({ ...p, [i]: !p[i] }))}
                      />
                    )}
                  </div>

                  {/* User avatar */}
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-[#DDD5C8] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User size={12} className="text-[#5C5246]" />
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Input area ── */}
          <div className="flex-shrink-0 px-5 pt-3 pb-4 border-t border-[#DDD5C8] bg-[#F5F0E8]">

            {/* Tool pills */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-[#B0A898]">Tools:</span>

              <button id="toggle-citation-lookup"
                onClick={() => setCitationEnabled(v => !v)}
                disabled={documents.length === 0}
                className={`pt-pill transition-all ${citationEnabled ? 'active' : ''} disabled:opacity-40 disabled:cursor-not-allowed`}>
                <BookOpen size={10} /> Citation Lookup
              </button>

              <button id="toggle-web-search"
                onClick={() => setWebEnabled(v => !v)}
                disabled={documents.length === 0}
                className={`pt-pill transition-all ${webEnabled ? 'active' : ''} disabled:opacity-40 disabled:cursor-not-allowed`}>
                <Globe size={10} /> Web Search
              </button>

              {isAgentMode && (
                <span className="text-[10px] text-[#D97706] font-medium ml-1">
                  Agent mode on
                </span>
              )}
            </div>

            {/* Input row */}
            <div className="flex items-end gap-2">
              <textarea
                id="chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder={documents.length === 0 ? 'Upload a PDF to start chatting…' : 'Ask a research question…'}
                rows={1}
                disabled={isTyping || documents.length === 0}
                className="flex-1 resize-none rounded-xl border border-[#DDD5C8] bg-white
                  px-4 py-2.5 text-sm text-[#2C2820] placeholder-[#C8C0B4]
                  focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/25
                  transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ minHeight: '42px', maxHeight: '120px' }}
              />
              <button id="send-button" onClick={handleSend}
                disabled={isTyping || !input.trim() || documents.length === 0}
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#F59E0B] text-[#0F1B2D]
                  flex items-center justify-center hover:bg-[#D97706]
                  disabled:opacity-35 disabled:cursor-not-allowed transition-colors">
                {isTyping ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
