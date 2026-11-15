import { useEffect, useRef, useState } from 'react'
import { totalDuration } from '../animation/interpolate'
import { useDrillStore } from '../store/drillStore'
import type { VideoFormat, VideoProgress } from '../video/exportVideo'
import { buttonClass } from './ui'

type ExportKind = 'png' | 'pdf' | VideoFormat

const MENU_ITEMS: { kind: ExportKind; label: string; video: boolean }[] = [
  { kind: 'png', label: 'Bild (PNG)', video: false },
  { kind: 'pdf', label: 'PDF', video: false },
  { kind: 'webm', label: 'Video (WebM)', video: true },
  { kind: 'mp4', label: 'Video (MP4)', video: true },
]

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

/** Export menu (image, PDF, video) with a progress dialog for videos. */
export function ExportMenu() {
  const canAnimate = useDrillStore((s) => totalDuration(s.scenes) > 0)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [videoProgress, setVideoProgress] = useState<VideoProgress | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close the menu when clicking or tapping elsewhere.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  async function runExport(kind: ExportKind) {
    setOpen(false)
    setBusy(true)
    try {
      if (kind === 'png' || kind === 'pdf') {
        const { exportPdf, exportPng } = await import('../export/exportDrill')
        await (kind === 'png' ? exportPng() : exportPdf())
      } else {
        const controller = new AbortController()
        abortRef.current = controller
        setVideoProgress({ phase: 'recording', progress: 0 })
        const { exportVideo } = await import('../video/exportVideo')
        await exportVideo(kind, setVideoProgress, controller.signal)
      }
    } catch (err) {
      if (!isAbort(err)) {
        console.error(err)
        const { VideoExportError } = await import('../video/recordAnimation')
        window.alert(
          err instanceof VideoExportError
            ? `Export fehlgeschlagen: ${err.message}`
            : 'Export fehlgeschlagen. Bitte versuche es noch einmal.',
        )
      }
    } finally {
      abortRef.current = null
      setVideoProgress(null)
      setBusy(false)
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        className={buttonClass}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
      >
        Exportieren ▾
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 z-40 mt-1 flex w-56 flex-col rounded-lg border border-slate-700 bg-slate-800 p-1 shadow-xl"
        >
          {MENU_ITEMS.map((item) => {
            const disabled = item.video && !canAnimate
            return (
              <button
                key={item.kind}
                type="button"
                role="menuitem"
                disabled={disabled}
                onClick={() => runExport(item.kind)}
                className="flex min-h-10 flex-col items-start justify-center rounded-md px-3 py-1 text-left text-sm text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                {item.label}
                {disabled && (
                  <span className="text-xs text-slate-400">Braucht mindestens zwei Szenen</span>
                )}
              </button>
            )
          })}
        </div>
      )}
      {videoProgress && (
        <VideoProgressDialog progress={videoProgress} onCancel={() => abortRef.current?.abort()} />
      )}
    </div>
  )
}

function VideoProgressDialog({ progress, onCancel }: { progress: VideoProgress; onCancel: () => void }) {
  const percent = progress.phase === 'preparing' ? null : Math.round(progress.progress * 100)
  const text = {
    recording: 'Video wird aufgenommen …',
    preparing: 'MP4-Umwandlung wird vorbereitet …',
    converting: 'Video wird in MP4 umgewandelt …',
  }[progress.phase]
  const hint = {
    recording: 'Die Aufnahme läuft in Echtzeit. Bitte lass dieses Fenster im Vordergrund.',
    preparing: 'Beim ersten Mal wird der Umwandler geladen (ca. 30 MB).',
    converting: 'Das kann etwas dauern.',
  }[progress.phase]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-progress-title"
        className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
      >
        <h2 id="video-progress-title" className="text-base font-semibold text-white">
          {text}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{hint}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full bg-emerald-500 transition-[width] ${percent === null ? 'w-1/3 animate-pulse' : ''}`}
            style={percent === null ? undefined : { width: `${percent}%` }}
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-slate-400 tabular-nums">{percent === null ? '' : `${percent} %`}</span>
          <button type="button" className={buttonClass} onClick={onCancel}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}
