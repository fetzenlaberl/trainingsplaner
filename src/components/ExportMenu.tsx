import { useRef, useState } from 'react'
import { totalDuration } from '../animation/interpolate'
import { useDrillStore } from '../store/drillStore'
import type { VideoFormat, VideoProgress } from '../video/exportVideo'
import { Dropdown } from './Dropdown'
import { TacticSheetDialog } from './TacticSheetDialog'
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
  const [busy, setBusy] = useState(false)
  const [videoProgress, setVideoProgress] = useState<VideoProgress | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  async function runExport(kind: ExportKind) {
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
    <>
      <Dropdown
        label="Exportieren"
        disabled={busy}
        items={[
          ...MENU_ITEMS.map((item) => {
            const disabled = item.video && !canAnimate
            return {
              label: item.label,
              disabled,
              hint: disabled ? 'Braucht mindestens zwei Szenen' : undefined,
              onSelect: () => runExport(item.kind),
            }
          }),
          {
            label: 'Taktikblatt (PDF) …',
            hint: 'Felder mit Notizen, Datum, Thema, Wappen',
            onSelect: () => setSheetOpen(true),
          },
        ]}
      />
      {sheetOpen && <TacticSheetDialog onClose={() => setSheetOpen(false)} />}
      {videoProgress && (
        <VideoProgressDialog progress={videoProgress} onCancel={() => abortRef.current?.abort()} />
      )}
    </>
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
