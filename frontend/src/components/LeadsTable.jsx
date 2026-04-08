import { useState } from 'react'

const TAG_CLASSES = {
  'Premium Opportunity': 'tag-premium',
  'High Opportunity': 'tag-high',
  'Normal Opportunity': 'tag-normal',
  'Low Priority': 'tag-low',
}

const TAG_ICONS = {
  'Premium Opportunity': '🏆',
  'High Opportunity': '✅',
  'Normal Opportunity': '📋',
  'Low Priority': '📉',
}

const WEB_CLASS = {
  NONE: 'web-none',
  VERY_POOR: 'web-very_poor',
  POOR: 'web-poor',
  DECENT: 'web-decent',
  EXCELLENT: 'web-excellent',
  ERROR: 'web-error',
}

const WEB_LABEL = {
  NONE: '✗ No Website',
  VERY_POOR: '⚠ Very Poor',
  POOR: '⚠ Poor',
  DECENT: '○ Decent',
  EXCELLENT: '✓ Excellent',
  ERROR: '? Unreachable',
}

function getLisColor(lis) {
  if (lis >= 70) return 'linear-gradient(90deg, #f59e0b, #ef4444)'
  if (lis >= 50) return 'linear-gradient(90deg, #22c55e, #14b8a6)'
  if (lis >= 30) return 'linear-gradient(90deg, #4f9cf9, #7c3aed)'
  return 'linear-gradient(90deg, #475569, #334155)'
}

export default function LeadsTable({ leads, onSelectLead }) {
  const [sortKey, setSortKey] = useState('lead_intelligence_score')
  const [sortDir, setSortDir] = useState(-1)

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => -d)
    else { setSortKey(key); setSortDir(-1) }
  }

  const sorted = [...leads].sort((a, b) => {
    let va, vb
    if (sortKey === 'lead_intelligence_score') {
      va = a.scoring?.lead_intelligence_score ?? 0
      vb = b.scoring?.lead_intelligence_score ?? 0
    } else if (sortKey === 'rating') {
      va = a.rating ?? 0; vb = b.rating ?? 0
    } else if (sortKey === 'review_count') {
      va = a.review_count ?? 0; vb = b.review_count ?? 0
    } else if (sortKey === 'web_quality') {
      const ord = { NONE: 5, VERY_POOR: 4, ERROR: 4, POOR: 3, DECENT: 2, EXCELLENT: 1 }
      va = ord[a.website?.quality_grade] ?? 0
      vb = ord[b.website?.quality_grade] ?? 0
    } else {
      va = a[sortKey] ?? ''; vb = b[sortKey] ?? ''
    }
    return sortDir * (va > vb ? 1 : va < vb ? -1 : 0)
  })

  function SortIcon({ k }) {
    if (sortKey !== k) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>
    return <span style={{ marginLeft: 4, color: 'var(--accent-primary)' }}>{sortDir > 0 ? '↑' : '↓'}</span>
  }

  if (leads.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔭</div>
        <div className="empty-title">No leads yet</div>
        <div className="empty-text">Configure your search parameters above and click Run Scraper to start finding medical leads.</div>
      </div>
    )
  }

  return (
    <div className="results-table-wrap">
      <table className="results-table">
        <thead>
          <tr>
            <th style={{ width: '28%' }} onClick={() => handleSort('name')}>
              Business <SortIcon k="name" />
            </th>
            <th onClick={() => handleSort('lead_intelligence_score')}>
              LIS Score <SortIcon k="lead_intelligence_score" />
            </th>
            <th>Tag</th>
            <th onClick={() => handleSort('web_quality')}>
              Web Quality <SortIcon k="web_quality" />
            </th>
            <th onClick={() => handleSort('rating')}>
              Rating <SortIcon k="rating" />
            </th>
            <th>Contact</th>
            <th>Area</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(lead => {
            const lis = lead.scoring?.lead_intelligence_score ?? 0
            const tag = lead.scoring?.tag ?? 'Low Priority'
            const webGrade = lead.website?.quality_grade ?? 'NONE'
            return (
              <tr key={lead.id} onClick={() => onSelectLead(lead)}>
                <td>
                  <div className="lead-name-cell">
                    {lead.thumbnail
                      ? <img src={lead.thumbnail} alt="" className="lead-thumb" loading="lazy" />
                      : <div className="lead-thumb-placeholder">🏥</div>
                    }
                    <div>
                      <div className="lead-name">{lead.name}</div>
                      <div className="lead-type">{lead.types?.slice(0, 2).join(' · ') || '-'}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="lis-cell">
                    <span className="lis-number">{lis}</span>
                    <div className="lis-bar">
                      <div
                        className="lis-bar-fill"
                        style={{ width: `${lis}%`, background: getLisColor(lis) }}
                      />
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`tag-badge ${TAG_CLASSES[tag] || 'tag-low'}`}>
                    {TAG_ICONS[tag]} {tag}
                  </span>
                </td>
                <td>
                  <span className={`web-pill ${WEB_CLASS[webGrade] || 'web-error'}`}>
                    {WEB_LABEL[webGrade] || webGrade}
                  </span>
                  {lead.website?.quality_score > 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                      {lead.website.quality_score}/100
                    </span>
                  )}
                </td>
                <td>
                  {lead.rating ? (
                    <div className="rating-cell">
                      <span className="star-icon">★</span>
                      <span className="rating-num">{lead.rating}</span>
                      <span className="review-count">({lead.review_count?.toLocaleString() ?? 0})</span>
                    </div>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No rating</span>}
                </td>
                <td>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {lead.phone
                      ? <span title="Phone">📞 {lead.phone}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>No phone</span>
                    }
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{
                      color: lead.scoring?.area_tier === 'High-End' ? 'var(--accent-gold)'
                        : lead.scoring?.area_tier === 'Normal' ? 'var(--accent-primary)'
                        : 'var(--text-muted)'
                    }}>
                      {lead.scoring?.area_tier === 'High-End' ? '💎' : lead.scoring?.area_tier === 'Normal' ? '🏙' : '📍'}
                      {' '}{lead.scoring?.area_tier}
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
