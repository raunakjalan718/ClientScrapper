import { useState, useRef, useCallback } from 'react'
import SearchPanel from './components/SearchPanel'
import ProgressStream from './components/ProgressStream'
import LeadsTable from './components/LeadsTable'
import LeadCard from './components/LeadCard'

const API_BASE = 'http://localhost:8000'

const TAG_ORDER = ['All', 'Premium Opportunity', 'High Opportunity', 'Normal Opportunity', 'Low Priority']
const WEB_FILTERS = ['All', 'NONE', 'VERY_POOR', 'POOR', 'DECENT', 'EXCELLENT']

function StatCard({ number, label, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-number" style={accent ? { color: accent } : {}}>{number}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function App() {
  const [leads, setLeads] = useState([])
  const [logs, setLogs] = useState([])
  const [progress, setProgress] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [tagFilter, setTagFilter] = useState('All')
  const [webFilter, setWebFilter] = useState('All')
  const [sessionId, setSessionId] = useState(null)

  const esRef = useRef(null)

  const addLog = useCallback((message, type = '') => {
    setLogs(prev => [...prev.slice(-200), { message, type }])
  }, [])

  function handleStart({ specialty, location, maxResults }) {
    setLeads([])
    setLogs([])
    setProgress(0)
    setTagFilter('All')
    setWebFilter('All')
    setIsRunning(true)

    const url = `${API_BASE}/scrape?specialty=${encodeURIComponent(specialty)}&location=${encodeURIComponent(location)}&max_results=${maxResults}`
    const es = new EventSource(url)
    esRef.current = es

    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      const { event, message, lead, progress: prog, session_id } = data

      if (session_id) setSessionId(session_id)
      if (prog != null) setProgress(prog)

      const typeMap = {
        error: 'error', done: 'done', phase: 'phase', start: 'phase',
      }
      addLog(message, typeMap[event] || '')

      if (event === 'lead_ready' && lead) {
        setLeads(prev => [...prev, lead])
        if (data.progress != null) setProgress(data.progress)
      }

      if (event === 'done') {
        setProgress(100)
        setIsRunning(false)
        es.close()
      }

      if (event === 'error') {
        // Continue; don't stop on single errors
      }
    }

    es.onerror = () => {
      addLog('⚡ Connection closed or error occurred.', 'error')
      setIsRunning(false)
      es.close()
    }
  }

  function handleStop() {
    esRef.current?.close()
    setIsRunning(false)
    addLog('⏹ Scraping stopped by user.', 'error')
  }

  function handleExport(format) {
    if (!sessionId) return
    window.open(`${API_BASE}/export/${sessionId}?format=${format}`, '_blank')
  }

  // Stats
  const premiumCount = leads.filter(l => l.scoring?.tag === 'Premium Opportunity').length
  const highCount = leads.filter(l => l.scoring?.tag === 'High Opportunity').length
  const noWebCount = leads.filter(l => l.website?.quality_grade === 'NONE').length
  const poorWebCount = leads.filter(l => ['VERY_POOR', 'POOR'].includes(l.website?.quality_grade)).length

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const tagOk = tagFilter === 'All' || lead.scoring?.tag === tagFilter
    const webOk = webFilter === 'All' || lead.website?.quality_grade === webFilter
    return tagOk && webOk
  })

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">💊</div>
          <div>
            <span className="logo-text">MedScrape</span>
            <span className="logo-sub">Medical Lead Intelligence Platform</span>
          </div>
        </div>
        <span className="header-badge">v1.0 · BETA</span>
      </header>

      {/* Search */}
      <SearchPanel onStart={handleStart} onStop={handleStop} isRunning={isRunning} />

      {/* Progress */}
      <ProgressStream logs={logs} progress={progress} isRunning={isRunning} />

      {/* Stats */}
      {leads.length > 0 && (
        <div className="stats-bar">
          <StatCard number={leads.length} label="Total Leads" />
          <StatCard number={premiumCount + highCount} label="High Priority" accent="var(--accent-gold)" />
          <StatCard number={noWebCount} label="No Website" accent="var(--web-none-text)" />
          <StatCard number={poorWebCount} label="Poor Website" accent="var(--web-poor-text)" />
        </div>
      )}

      {/* Filter Bar */}
      {leads.length > 0 && (
        <div className="filter-bar">
          <span className="filter-label">Tag:</span>
          {TAG_ORDER.map(t => (
            <button
              key={t}
              className={`filter-chip ${tagFilter === t ? 'active' : ''}`}
              onClick={() => setTagFilter(t)}
            >
              {t}
            </button>
          ))}

          <div className="filter-divider" />

          <span className="filter-label">Website:</span>
          {WEB_FILTERS.map(w => (
            <button
              key={w}
              className={`filter-chip ${webFilter === w ? 'active' : ''}`}
              onClick={() => setWebFilter(w)}
            >
              {w === 'All' ? 'All' : w.replace('_', ' ')}
            </button>
          ))}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button className="export-btn" onClick={() => handleExport('csv')}>
              📥 Export CSV
            </button>
            <button className="export-btn" onClick={() => handleExport('json')}>
              📄 Export JSON
            </button>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <LeadsTable leads={filteredLeads} onSelectLead={setSelectedLead} />

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadCard lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  )
}
