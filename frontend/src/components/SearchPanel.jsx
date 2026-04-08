import { useState } from 'react'

const SPECIALTIES = [
  'Cardiologist', 'Dentist', 'Dermatologist', 'ENT Specialist',
  'General Physician', 'Gynecologist', 'Hospital', 'Medical Clinic',
  'Neurologist', 'Ophthalmologist', 'Orthopedic', 'Pediatrician',
  'Plastic Surgeon', 'Psychiatrist', 'Radiologist', 'Urologist',
]

export default function SearchPanel({ onStart, onStop, isRunning }) {
  const [specialty, setSpecialty] = useState('')
  const [customSpecialty, setCustomSpecialty] = useState('')
  const [location, setLocation] = useState('')
  const [maxResults, setMaxResults] = useState(40)

  function handleSubmit(e) {
    e.preventDefault()
    const finalSpecialty = customSpecialty.trim() || specialty
    if (!finalSpecialty || !location.trim()) return
    onStart({ specialty: finalSpecialty, location: location.trim(), maxResults })
  }

  return (
    <div className="search-panel">
      <div className="search-panel-title">🔍 Search Parameters</div>
      <form onSubmit={handleSubmit}>
        <div className="search-grid">
          <div className="field-group">
            <label className="field-label">Specialty / Type</label>
            <select
              className="field-input field-select"
              value={specialty}
              onChange={e => { setSpecialty(e.target.value); setCustomSpecialty('') }}
            >
              <option value="">Select a specialty...</option>
              {SPECIALTIES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              className="field-input"
              placeholder="Or type custom (e.g. Ayurvedic clinic)"
              value={customSpecialty}
              onChange={e => { setCustomSpecialty(e.target.value); setSpecialty('') }}
              style={{ marginTop: '6px' }}
            />
          </div>

          <div className="field-group">
            <label className="field-label">Area / Location</label>
            <input
              className="field-input"
              placeholder="e.g. Bandra Mumbai, Koregaon Park Pune"
              value={location}
              onChange={e => setLocation(e.target.value)}
              required
            />
          </div>

          <div className="field-group results-slider-wrap">
            <label className="field-label">Max Results: <strong style={{ color: 'var(--accent-primary)' }}>{maxResults}</strong></label>
            <input
              type="range"
              className="results-slider"
              min={10}
              max={120}
              step={10}
              value={maxResults}
              onChange={e => setMaxResults(Number(e.target.value))}
            />
            <div className="slider-labels">
              <span>10</span>
              <span>~{Math.ceil(maxResults / 20)} API pages</span>
              <span>120</span>
            </div>
          </div>

          <button
            type={isRunning ? 'button' : 'submit'}
            onClick={isRunning ? onStop : undefined}
            className={`btn-scrape ${isRunning ? 'running' : ''}`}
          >
            {isRunning ? '⏹ Stop' : '🚀 Run Scraper'}
          </button>
        </div>
      </form>
    </div>
  )
}
