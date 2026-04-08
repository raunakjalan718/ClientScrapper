export default function LeadCard({ lead, onClose }) {
  if (!lead) return null

  const scoring = lead.scoring || {}
  const website = lead.website || {}
  const hours = lead.operating_hours || {}

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

  const checks = website.checks || {}

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-section">
            <div className="modal-name">{lead.name}</div>
            <div className="modal-type">{lead.types?.join(' · ') || 'Medical Business'}</div>
            <div style={{ marginTop: '10px' }}>
              <span className={`tag-badge tag-${scoring.tag?.split(' ')[0].toLowerCase() || 'low'}`}>
                {scoring.tag || 'Unrated'}
              </span>
              <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                {scoring.area_tier} Area
              </span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* Contact Info */}
          <div className="modal-section">
            <div className="modal-section-title">📌 Contact Information</div>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-item-label">Address</div>
                <div className="info-item-value">{lead.address || '—'}</div>
              </div>
              <div className="info-item">
                <div className="info-item-label">Phone</div>
                <div className="info-item-value">{lead.phone || '—'}</div>
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
              {lead.booking_link && (
                <div className="info-item" style={{ gridColumn: 'span 2' }}>
                  <div className="info-item-label">Booking Link</div>
                  <div className="info-item-value">
                    <a href={lead.booking_link} target="_blank" rel="noopener noreferrer">
                      {lead.booking_link}
                    </a>
                  </div>
                </div>
              )}
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
                fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6'
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
                    <tr key={day}>
                      <td>{day}</td>
                      <td>{time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Website Audit */}
          <div className="modal-section">
            <div className="modal-section-title">🌐 Website Analysis</div>
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)',
                color: website.quality_grade === 'NONE' ? 'var(--web-none-text)'
                  : website.quality_grade === 'VERY_POOR' ? 'var(--web-poor-text)'
                  : website.quality_grade === 'POOR' ? 'var(--web-decent-text)'
                  : website.quality_grade === 'DECENT' ? '#6ee7b7'
                  : 'var(--web-excellent-text)'
              }}>
                {website.quality_grade || 'NONE'}
              </div>
              {website.url && (
                <a href={website.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: 'var(--accent-primary)', wordBreak: 'break-all' }}
                >
                  {website.url}
                </a>
              )}
              {!website.url && (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No website found — top priority lead</span>
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
              <AuditItem label="Custom Domain" value={!checks.free_builder_detected ? 'Yes' : 'Free Builder'} isPass={!checks.free_builder_detected} />
              <AuditItem label="Copyright Year" value={checks.copyright_year || '—'} isPass={checks.copyright_year >= 2022}
                isNeutral={!checks.copyright_year} />
              <AuditItem label="Outdated HTML" value={checks.outdated_html ? 'Yes' : 'No'} isPass={!checks.outdated_html} />
              <AuditItem label="CMS Detected" value={checks.cms_detected || 'Unknown'} isNeutral={!checks.cms_detected} isPass={false} />
            </div>
          </div>

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
            <div className="lis-total">
              <div className="lis-total-left">
                <div>
                  <div className="lis-total-val">{scoring.lead_intelligence_score ?? 0}</div>
                  <div className="lis-total-label">/ 100 LEAD INTELLIGENCE SCORE</div>
                </div>
              </div>
              <div>
                <span className={`tag-badge tag-${scoring.tag?.split(' ')[0].toLowerCase() || 'low'}`} style={{ fontSize: '13px', padding: '6px 14px' }}>
                  {scoring.tag || 'Unrated'}
                </span>
              </div>
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
