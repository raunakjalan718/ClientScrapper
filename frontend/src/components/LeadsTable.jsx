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

// Platform labels for link chips
const PLATFORM_SHORT = {
  facebook: { label: 'FB', color: '#1877f2', bg: 'rgba(24,119,242,0.12)' },
  instagram: { label: 'IG', color: '#e1306c', bg: 'rgba(225,48,108,0.12)' },
  twitter: { label: 'X', color: '#1da1f2', bg: 'rgba(29,161,242,0.12)' },
  linkedin: { label: 'LI', color: '#0a66c2', bg: 'rgba(10,102,194,0.12)' },
  youtube: { label: 'YT', color: '#ff0000', bg: 'rgba(255,0,0,0.12)' },
  whatsapp: { label: 'WA', color: '#25d366', bg: 'rgba(37,211,102,0.12)' },
  pinterest: { label: 'PIN', color: '#e60023', bg: 'rgba(230,0,35,0.12)' },
  threads: { label: 'TH', color: '#aaa', bg: 'rgba(170,170,170,0.12)' },
  practo: { label: 'Practo', color: '#5c99d6', bg: 'rgba(92,153,214,0.12)' },
  justdial: { label: 'JD', color: '#ff7900', bg: 'rgba(255,121,0,0.12)' },
  lybrate: { label: 'Lybrate', color: '#00b4a0', bg: 'rgba(0,180,160,0.12)' },
  apollo247: { label: 'Apollo', color: '#00a3e0', bg: 'rgba(0,163,224,0.12)' },
  '1mg': { label: '1mg', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  zocdoc: { label: 'ZocDoc', color: '#6c63ff', bg: 'rgba(108,99,255,0.12)' },
  credihealth: { label: 'Credi', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  healthgrades: { label: 'HG', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  mfine: { label: 'MFine', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
  clinicspots: { label: 'Clinic', color: '#14b8a6', bg: 'rgba(20,184,166,0.12)' },
  sulekha: { label: 'Sulekha', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
}

/** Aggregates all URLs from a lead into a flat deduped array of {label, url, color, bg} */
function aggregateLinks(lead) {
  const links = []
  const seen = new Set()

  function add(label, url, color = '#94a3b8', bg = 'rgba(148,163,184,0.1)') {
    if (!url || seen.has(url)) return
    seen.add(url)
    links.push({ label, url, color, bg })
  }

  // 1. Main website
  if (lead.website?.url && lead.website.status === 'EXISTS') {
    try {
      const domain = new URL(lead.website.url).hostname.replace('www.', '')
      add(domain, lead.website.url, '#4f9cf9', 'rgba(79,156,249,0.1)')
    } catch {
      add('Website', lead.website.url, '#4f9cf9', 'rgba(79,156,249,0.1)')
    }
  }

  // 2. Social media
  for (const [platform, url] of Object.entries(lead.social_links || {})) {
    const p = PLATFORM_SHORT[platform] || { label: platform, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
    add(p.label, url, p.color, p.bg)
  }

  // 3. Directory links from website audit
  for (const [platform, url] of Object.entries(lead.directory_links || {})) {
    const p = PLATFORM_SHORT[platform] || { label: platform, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
    add(p.label, url, p.color, p.bg)
  }

  // 4. Place links from SerpAPI enrichment
  for (const [key, url] of Object.entries(lead.place_links || {})) {
    const label = key.replace(/_/g, ' ')
    add(label, url, '#a78bfa', 'rgba(167,139,250,0.1)')
  }

  // 5. Booking link
  if (lead.booking_link) {
    add('Booking', lead.booking_link, '#f59e0b', 'rgba(245,158,11,0.1)')
  }

  return links
}

function getLisColor(lis) {
  if (lis >= 70) return 'linear-gradient(90deg, #f59e0b, #ef4444)'
  if (lis >= 50) return 'linear-gradient(90deg, #22c55e, #14b8a6)'
  if (lis >= 30) return 'linear-gradient(90deg, #4f9cf9, #7c3aed)'
  return 'linear-gradient(90deg, #475569, #334155)'
}

/** Compact inline link chip */
function LinkChip({ label, url, color, bg }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      title={url}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: bg,
        border: `1px solid ${color}44`,
        borderRadius: '4px',
        color: color,
        fontSize: '10px',
        fontWeight: 600,
        padding: '2px 7px',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        transition: 'opacity 0.15s',
        letterSpacing: '0.2px',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      {label} ↗
    </a>
  )
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
    } else if (sortKey === 'links_count') {
      va = aggregateLinks(a).length
      vb = aggregateLinks(b).length
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
            <th style={{ width: '20%' }} onClick={() => handleSort('name')}>
              Business <SortIcon k="name" />
            </th>
            <th onClick={() => handleSort('lead_intelligence_score')}>
              LIS <SortIcon k="lead_intelligence_score" />
            </th>
            <th>Tag</th>
            <th onClick={() => handleSort('web_quality')}>
              Web <SortIcon k="web_quality" />
            </th>
            <th onClick={() => handleSort('rating')}>
              Rating <SortIcon k="rating" />
            </th>
            <th>Contact</th>
            <th onClick={() => handleSort('links_count')} style={{ width: '28%' }}>
              📎 All Links &amp; Profiles <SortIcon k="links_count" />
            </th>
            <th>Area</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(lead => {
            const lis = lead.scoring?.lead_intelligence_score ?? 0
            const tag = lead.scoring?.tag ?? 'Low Priority'
            const webGrade = lead.website?.quality_grade ?? 'NONE'
            const allLinks = aggregateLinks(lead)

            return (
              <tr key={lead.id} onClick={() => onSelectLead(lead)}>
                {/* Business name */}
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

                {/* LIS Score */}
                <td>
                  <div className="lis-cell">
                    <span className="lis-number">{lis}</span>
                    <div className="lis-bar">
                      <div className="lis-bar-fill" style={{ width: `${lis}%`, background: getLisColor(lis) }} />
                    </div>
                  </div>
                </td>

                {/* Tag */}
                <td>
                  <span className={`tag-badge ${TAG_CLASSES[tag] || 'tag-low'}`}>
                    {TAG_ICONS[tag]} {tag}
                  </span>
                </td>

                {/* Website quality */}
                <td>
                  <span className={`web-pill ${WEB_CLASS[webGrade] || 'web-error'}`}>
                    {WEB_LABEL[webGrade] || webGrade}
                  </span>
                  {lead.website?.quality_score > 0 && (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                      {lead.website.quality_score}/100
                    </span>
                  )}
                </td>

                {/* Rating */}
                <td>
                  {lead.rating ? (
                    <div className="rating-cell">
                      <span className="star-icon">★</span>
                      <span className="rating-num">{lead.rating}</span>
                      <span className="review-count">({lead.review_count?.toLocaleString() ?? 0})</span>
                    </div>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>}
                </td>

                {/* Contact */}
                <td>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {lead.phone
                      ? <span>📞 {lead.phone}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>No phone</span>
                    }
                    {lead.emails?.length > 0 && (
                      <span style={{ color: 'var(--accent-success)', fontSize: '11px' }}>
                        ✉ {lead.emails[0]}
                      </span>
                    )}
                  </div>
                </td>

                {/* ── ALL LINKS & PROFILES ── */}
                <td>
                  {allLinks.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                      {allLinks.map(({ label, url, color, bg }, i) => (
                        <LinkChip key={i} label={label} url={url} color={color} bg={bg} />
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No links found</span>
                  )}
                </td>

                {/* Area */}
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
