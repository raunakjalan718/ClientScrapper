const SOCIAL_ICONS = {
  facebook: { icon: '📘', label: 'Facebook', color: '#1877f2' },
  instagram: { icon: '📸', label: 'Instagram', color: '#e1306c' },
  twitter: { icon: '🐦', label: 'Twitter / X', color: '#1da1f2' },
  linkedin: { icon: '💼', label: 'LinkedIn', color: '#0a66c2' },
  youtube: { icon: '▶️', label: 'YouTube', color: '#ff0000' },
  whatsapp: { icon: '💬', label: 'WhatsApp', color: '#25d366' },
  pinterest: { icon: '📌', label: 'Pinterest', color: '#e60023' },
  threads: { icon: '🧵', label: 'Threads', color: '#ffffff' },
}

const DIR_ICONS = {
  practo: '🏥',
  justdial: '📞',
  lybrate: '💊',
  apollo247: '⚕️',
  '1mg': '💊',
  healthgrades: '🩺',
  zocdoc: '📅',
  credihealth: '🏨',
  docdoc: '🔍',
  mfine: '📱',
  clinicspots: '📍',
  sulekha: '🔎',
  bajajfinservhealth: '🏦',
}

export default function LeadCard({ lead, onClose }) {
  if (!lead) return null

  const scoring = lead.scoring || {}
  const website = lead.website || {}
  const hours = lead.operating_hours || {}
  const checks = website.checks || {}
  const emails = lead.emails || []
  const socialLinks = lead.social_links || {}
  const directoryLinks = lead.directory_links || {}
  const placeLinks = lead.place_links || {}

  // Merge directory links from website audit + place enrichment
  const allDirectoryLinks = { ...directoryLinks }
  for (const [k, v] of Object.entries(placeLinks)) {
    if (!allDirectoryLinks[k]) allDirectoryLinks[k] = v
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  function getLisBarColor(lis) {
    if (lis >= 70) return 'linear-gradient(90deg, #f59e0b, #ef4444)'
    if (lis >= 50) return 'linear-gradient(90deg, #22c55e, #14b8a6)'
    return 'linear-gradient(90deg, #4f9cf9, #7c3aed)'
  }

  function AuditItem({ label, value, isPass, isNeutral }) {
    const icon = isNeutral ? '—' : isPass ? '✓' : '✗'
    const cls = isNeutral ? 'audit-neutral' : isPass ? 'audit-pass' : 'audit-fail'
    return (
      <div className="audit-item">
        <span className={`audit-check ${cls}`}>{icon}</span>
        <span style={{ color: 'var(--text-secondary)' }}>{label}: </span>
        <span style={{ color: 'var(--text-primary)', marginLeft: 'auto', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
          {String(value)}
        </span>
      </div>
    )
  }

  const tagClass = `tag-${(scoring.tag || 'Low Priority').split(' ')[0].toLowerCase()}`

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="modal-header">
          <div className="modal-title-section">
            <div className="modal-name">{lead.name}</div>
            <div className="modal-type">{lead.types?.join(' · ') || 'Medical Business'}</div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={`tag-badge ${tagClass}`}>{scoring.tag || 'Unrated'}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{scoring.area_tier} Area</span>
              {emails.length > 0 && (
                <span style={{ fontSize: '12px', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ✉ Email found
                </span>
              )}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="modal-body">

          {/* Contact Information */}
          <div className="modal-section">
            <div className="modal-section-title">📌 Contact Information</div>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-item-label">Address</div>
                <div className="info-item-value">{lead.address || '—'}</div>
              </div>
              <div className="info-item">
                <div className="info-item-label">Phone</div>
                <div className="info-item-value">
                  {lead.phone
                    ? <a href={`tel:${lead.phone}`} style={{ color: 'var(--accent-primary)' }}>{lead.phone}</a>
                    : '—'}
                </div>
              </div>
              {lead.neighborhood && (
                <div className="info-item">
                  <div className="info-item-label">Neighborhood</div>
                  <div className="info-item-value">{lead.neighborhood}</div>
                </div>
              )}
              {lead.located_in && (
                <div className="info-item">
                  <div className="info-item-label">Located In</div>
                  <div className="info-item-value">{lead.located_in}</div>
                </div>
              )}
            </div>

            {/* Email addresses */}
            {emails.length > 0 ? (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.8px' }}>
                  EMAIL ADDRESSES FOUND
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {emails.map((email, i) => (
                    <div key={i} style={{
                      background: 'rgba(34,197,94,0.07)',
                      border: '1px solid rgba(34,197,94,0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent-success)' }}>
                        ✉ {email}
                      </span>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button
                          onClick={() => copyToClipboard(email)}
                          title="Copy email"
                          style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)',
                            cursor: 'pointer', fontSize: '11px', padding: '3px 8px',
                          }}
                        >
                          📋 Copy
                        </button>
                        <a
                          href={`mailto:${email}`}
                          style={{
                            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                            borderRadius: 'var(--radius-sm)', color: 'var(--accent-success)',
                            fontSize: '11px', padding: '3px 8px', textDecoration: 'none',
                          }}
                        >
                          ↗ Send
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                marginTop: '12px', background: 'rgba(239,68,68,0.06)',
                border: '1px dashed rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)',
                padding: '10px 14px', fontSize: '12px', color: 'var(--text-muted)',
              }}>
                ✗ No email found on website or contact page
              </div>
            )}

            {/* Booking link */}
            {lead.booking_link && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.8px' }}>
                  BOOKING / APPOINTMENT
                </div>
                <a href={lead.booking_link} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(79,156,249,0.08)', border: '1px solid rgba(79,156,249,0.3)',
                    borderRadius: 'var(--radius-md)', padding: '8px 14px',
                    color: 'var(--accent-primary)', fontSize: '13px', textDecoration: 'none',
                  }}>
                  📅 {lead.booking_link}
                </a>
              </div>
            )}
          </div>

          {/* Social Media */}
          {Object.keys(socialLinks).length > 0 && (
            <div className="modal-section">
              <div className="modal-section-title">📱 Social Media</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Object.entries(socialLinks).map(([platform, url]) => {
                  const info = SOCIAL_ICONS[platform] || { icon: '🔗', label: platform, color: '#94a3b8' }
                  return (
                    <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '7px',
                        background: 'var(--bg-glass)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)', padding: '9px 14px',
                        color: info.color, fontSize: '13px', fontWeight: 500,
                        textDecoration: 'none', transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = info.color}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <span style={{ fontSize: '16px' }}>{info.icon}</span>
                      {info.label}
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Directory Profiles */}
          {Object.keys(allDirectoryLinks).length > 0 && (
            <div className="modal-section">
              <div className="modal-section-title">🗂 Directory & Profile Links</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {Object.entries(allDirectoryLinks).map(([platform, url]) => (
                  <div key={platform} style={{
                    background: 'var(--bg-glass)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', padding: '10px 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{DIR_ICONS[platform] || '🔗'}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        {platform}
                      </span>
                    </div>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '12px', color: 'var(--accent-primary)', textDecoration: 'none', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      ↗ {url}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Website Analysis */}
          <div className="modal-section">
            <div className="modal-section-title">🌐 Website Analysis</div>
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{
                fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)',
                color: website.quality_grade === 'NONE' ? 'var(--web-none-text)'
                  : website.quality_grade === 'VERY_POOR' ? 'var(--web-poor-text)'
                  : website.quality_grade === 'POOR' ? 'var(--web-decent-text)'
                  : website.quality_grade === 'DECENT' ? '#6ee7b7'
                  : 'var(--web-excellent-text)',
              }}>
                {website.quality_grade || 'NONE'}
                {website.quality_score > 0 && (
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                    {website.quality_score}/100
                  </span>
                )}
              </div>
              {website.url && (
                <a href={website.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: 'var(--accent-primary)', wordBreak: 'break-all' }}>
                  ↗ {website.url}
                </a>
              )}
              {!website.url && (
                <span style={{ fontSize: '13px', color: 'var(--web-none-text)' }}>
                  ✗ No website — top opportunity lead
                </span>
              )}
            </div>
            <div className="audit-grid">
              <AuditItem label="HTTPS" value={checks.https ? 'Yes' : 'No'} isPass={checks.https} />
              <AuditItem label="Mobile Viewport" value={checks.mobile_viewport ? 'Yes' : 'No'} isPass={checks.mobile_viewport} />
              <AuditItem label="Responsive CSS" value={checks.responsive_css ? 'Yes' : 'No'} isPass={checks.responsive_css} />
              <AuditItem label="Page Load" value={checks.load_time_sec != null ? `${checks.load_time_sec}s` : '—'}
                isPass={checks.load_time_sec != null && checks.load_time_sec < 3} isNeutral={checks.load_time_sec == null} />
              <AuditItem label="Has Booking" value={checks.has_booking_system ? 'Yes' : 'No'} isPass={checks.has_booking_system} />
              <AuditItem label="Social Links" value={checks.social_links ? 'Yes' : 'No'} isPass={checks.social_links} />
              <AuditItem label="Emails Found" value={checks.emails_found ?? 0} isPass={checks.emails_found > 0} />
              <AuditItem label="Custom Domain" value={!checks.free_builder_detected ? 'Yes' : 'Free Builder'} isPass={!checks.free_builder_detected} />
              <AuditItem label="Copyright Year" value={checks.copyright_year || '—'}
                isPass={checks.copyright_year >= 2022} isNeutral={!checks.copyright_year} />
              <AuditItem label="Outdated HTML" value={checks.outdated_html ? 'Yes' : 'No'} isPass={!checks.outdated_html} />
              <AuditItem label="CMS" value={checks.cms_detected || 'Unknown'} isNeutral={true} isPass={false} />
              <AuditItem label="Directory Profiles" value={checks.directory_profiles_count ?? 0}
                isPass={checks.directory_profiles_count > 0} isNeutral={!checks.directory_profiles_count} />
            </div>
          </div>

          {/* Google Business Info */}
          <div className="modal-section">
            <div className="modal-section-title">📊 Business Intelligence</div>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-item-label">Rating</div>
                <div className="info-item-value">
                  {lead.rating ? `★ ${lead.rating} (${lead.review_count?.toLocaleString()} reviews)` : '—'}
                </div>
              </div>
              <div className="info-item">
                <div className="info-item-label">Price Level</div>
                <div className="info-item-value">{lead.price_level || '—'}</div>
              </div>
              <div className="info-item">
                <div className="info-item-label">Status</div>
                <div className="info-item-value">{lead.open_state || '—'}</div>
              </div>
              {lead.payments?.length > 0 && (
                <div className="info-item">
                  <div className="info-item-label">Payments</div>
                  <div className="info-item-value">{lead.payments.join(', ')}</div>
                </div>
              )}
            </div>

            {lead.description && (
              <div style={{
                marginTop: '12px', background: 'var(--bg-glass)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '12px 14px',
                fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6',
              }}>
                {lead.description}
              </div>
            )}

            {lead.highlights?.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>HIGHLIGHTS</div>
                <div className="chip-wrap">
                  {lead.highlights.map((h, i) => <span key={i} className="chip">{h}</span>)}
                </div>
              </div>
            )}
          </div>

          {/* Operating Hours */}
          {Object.keys(hours).length > 0 && (
            <div className="modal-section">
              <div className="modal-section-title">🕐 Operating Hours</div>
              <table className="hours-table">
                <tbody>
                  {Object.entries(hours).map(([day, time]) => (
                    <tr key={day}><td>{day}</td><td>{time}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Lead Scoring */}
          <div className="modal-section">
            <div className="modal-section-title">🎯 Lead Intelligence Score</div>
            <div className="score-breakdown">
              <div className="score-item">
                <div className="score-item-val">{scoring.area_prestige_score ?? 0}</div>
                <div className="score-item-label">Area Prestige</div>
              </div>
              <div className="score-item">
                <div className="score-item-val">{scoring.business_prestige_score ?? 0}</div>
                <div className="score-item-label">Business Signals</div>
              </div>
              <div className="score-item">
                <div className="score-item-val">{scoring.opportunity_score ?? 0}</div>
                <div className="score-item-label">Opportunity</div>
              </div>
            </div>
            <div className="lis-total" style={{ marginTop: '12px' }}>
              <div className="lis-total-left">
                <div>
                  <div className="lis-total-val">{scoring.lead_intelligence_score ?? 0}</div>
                  <div className="lis-total-label">/ 100 LEAD INTELLIGENCE SCORE</div>
                </div>
              </div>
              <span className={`tag-badge ${tagClass}`} style={{ fontSize: '13px', padding: '6px 14px' }}>
                {scoring.tag || 'Unrated'}
              </span>
            </div>
          </div>

          {/* Top Reviews */}
          {lead.top_reviews?.length > 0 && (
            <div className="modal-section">
              <div className="modal-section-title">💬 Customer Reviews</div>
              {lead.top_reviews.map((r, i) => (
                <div key={i} className="review-card">"{r}"</div>
              ))}
            </div>
          )}

          {/* GPS */}
          {lead.gps && (
            <div className="modal-section">
              <div className="modal-section-title">🗺 GPS Coordinates</div>
              <a
                href={`https://maps.google.com/?q=${lead.gps.latitude},${lead.gps.longitude}`}
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '13px', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}
              >
                {lead.gps.latitude}, {lead.gps.longitude} — View on Maps ↗
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
