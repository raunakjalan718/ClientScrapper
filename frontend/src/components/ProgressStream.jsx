import { useEffect, useRef } from 'react'

export default function ProgressStream({ logs, progress, isRunning }) {
  const logRef = useRef(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  if (!isRunning && logs.length === 0) return null

  return (
    <div className="progress-panel">
      <div className="progress-header">
        <span className="progress-title">
          <span className={`live-dot ${isRunning ? '' : 'idle'}`} />
          {isRunning ? 'Live Pipeline' : 'Pipeline Complete'}
        </span>
        <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          {progress}%
        </span>
      </div>

      <div className="progress-bar-wrap">
        <div
          className="progress-bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="progress-log" ref={logRef}>
        {logs.map((log, i) => (
          <div
            key={i}
            className={`log-entry ${i === logs.length - 1 ? 'latest' : ''} ${log.type || ''}`}
          >
            {log.message}
          </div>
        ))}
      </div>
    </div>
  )
}
