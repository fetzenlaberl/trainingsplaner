import { locateTime, sceneStartTime, totalDuration } from '../animation/interpolate'
import { currentScene, useDrillStore } from '../store/drillStore'
import { usePlaybackLoop } from '../hooks/usePlaybackLoop'
import { togglePlayback } from '../store/playbackActions'
import { DEFAULT_TILT, MAX_TILT, MAX_TURN, MIN_TILT, MIN_TURN } from '../perspective/perspective'
import { usePerspectiveStore } from '../store/perspectiveStore'
import { SPEEDS, usePlaybackStore } from '../store/playbackStore'
import { buttonClass, dangerButtonClass, inputClass } from './ui'

const DURATION_OPTIONS_S = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10]

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1).replace('.', ',')} s`
}

function formatNumber(value: number): string {
  return String(value).replace('.', ',')
}

/** Scene list, scene actions and playback controls. */
export function Timeline() {
  const scenes = useDrillStore((s) => s.scenes)
  const sceneIndex = useDrillStore((s) => s.sceneIndex)
  const duration = useDrillStore((s) => currentScene(s).durationMs)
  const selectScene = useDrillStore((s) => s.selectScene)
  const addScene = useDrillStore((s) => s.addScene)
  const deleteScene = useDrillStore((s) => s.deleteScene)
  const setSceneDuration = useDrillStore((s) => s.setSceneDuration)
  const time = usePlaybackStore((s) => s.time)
  const playing = usePlaybackStore((s) => s.playing)
  const speed = usePlaybackStore((s) => s.speed)
  const seek = usePlaybackStore((s) => s.seek)
  const stop = usePlaybackStore((s) => s.stop)
  const setSpeed = usePlaybackStore((s) => s.setSpeed)
  const perspectiveOn = usePerspectiveStore((s) => s.enabled)
  const tilt = usePerspectiveStore((s) => s.tilt)
  const setPerspectiveOn = usePerspectiveStore((s) => s.setEnabled)
  const setTilt = usePerspectiveStore((s) => s.setTilt)
  const turn = usePerspectiveStore((s) => s.turn)
  const setTurn = usePerspectiveStore((s) => s.setTurn)
  usePlaybackLoop()

  const total = totalDuration(scenes)
  const animating = time !== null
  const shownIndex = animating ? locateTime(scenes, time).index : sceneIndex
  const sliderValue = time ?? sceneStartTime(scenes, sceneIndex)
  const isLastScene = sceneIndex === scenes.length - 1

  const editScene = (index: number) => {
    stop()
    selectScene(index)
  }

  return (
    <div className="flex flex-col gap-2 border-t border-slate-700 bg-slate-900 py-2 pr-12 pl-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <button
          type="button"
          className={`${buttonClass} min-w-24 justify-center`}
          disabled={total <= 0}
          title={total <= 0 ? 'Für die Animation mindestens zwei Szenen anlegen' : 'Abspielen (Leertaste)'}
          onClick={togglePlayback}
        >
          {playing ? '❚❚ Pause' : '▶ Abspielen'}
        </button>
        {animating && (
          <button type="button" className={buttonClass} onClick={stop} title="Zurück zum Bearbeiten">
            ■ Stopp
          </button>
        )}
        <input
          type="range"
          aria-label="Zeit"
          className="min-w-32 flex-1 accent-emerald-500"
          min={0}
          max={Math.max(total, 1)}
          step={10}
          value={sliderValue}
          disabled={total <= 0}
          onChange={(e) => {
            if (!animating) useDrillStore.getState().select(null)
            seek(Number(e.target.value))
          }}
        />
        <span className="w-24 text-right text-sm text-slate-400 tabular-nums">
          {formatSeconds(sliderValue)} / {formatSeconds(total)}
        </span>
        <select
          aria-label="Tempo"
          title="Tempo der Animation"
          className={inputClass}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value) as typeof speed)}
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {formatNumber(s)}×
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-pressed={perspectiveOn}
          title="Perspektivische TV-Ansicht zum Anschauen und Exportieren (Bearbeiten nur flach)"
          onClick={() => {
            useDrillStore.getState().select(null)
            setPerspectiveOn(!perspectiveOn)
          }}
          className={`${buttonClass} ${perspectiveOn ? 'bg-emerald-600 text-white hover:bg-emerald-500' : ''}`}
        >
          3D-Ansicht
        </button>
        {perspectiveOn && (
          <label className="flex items-center gap-1.5 text-sm text-slate-400">
            Neigung
            <input
              type="range"
              className="w-24 accent-emerald-500"
              min={MIN_TILT}
              max={MAX_TILT}
              step={1}
              value={tilt}
              onChange={(e) => setTilt(Number(e.target.value))}
            />
            <span className="w-9 text-right tabular-nums">{tilt}°</span>
          </label>
        )}
        {perspectiveOn && (
          <div
            role="group"
            aria-label="Drehung der 3D-Ansicht"
            className="flex flex-wrap items-center gap-1.5 text-sm text-slate-400"
            title="Tipp: In der 3D-Ansicht aufs Feld fassen und ziehen – links/rechts dreht, hoch/runter neigt."
          >
            <button type="button" className={buttonClass} aria-label="45° nach links drehen" onClick={() => setTurn(turn - 45)}>
              ⟲ 45°
            </button>
            <label className="flex items-center gap-1.5">
              Drehung
              <input
                type="range"
                className="w-28 accent-emerald-500"
                min={MIN_TURN}
                max={MAX_TURN}
                step={1}
                value={turn}
                onChange={(e) => setTurn(Number(e.target.value))}
              />
              <span className="w-11 text-right tabular-nums">{turn}°</span>
            </label>
            <button type="button" className={buttonClass} aria-label="45° nach rechts drehen" onClick={() => setTurn(turn + 45)}>
              ⟳ 45°
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={turn === 0 && tilt === DEFAULT_TILT}
              onClick={() => {
                setTurn(0)
                setTilt(DEFAULT_TILT)
              }}
            >
              Zurück
            </button>
          </div>
        )}
        <span className="mx-1 hidden h-6 w-px bg-slate-700 sm:block" aria-hidden />
        <div role="group" aria-label="Szenen" className="flex flex-wrap gap-1">
          {scenes.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={i === shownIndex}
              title={`Szene ${i + 1} bearbeiten`}
              onClick={() => editScene(i)}
              className={`min-h-10 min-w-10 rounded-md px-3 text-sm font-semibold ${
                i === shownIndex
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={buttonClass}
          title="Neue Szene nach der aktuellen; Ball und Spieler wandern ans Ende ihrer Linien"
          onClick={() => {
            stop()
            addScene()
          }}
        >
          + Szene
        </button>
        <button
          type="button"
          className={dangerButtonClass}
          disabled={scenes.length <= 1}
          onClick={() => {
            stop()
            deleteScene()
          }}
        >
          − Szene
        </button>
        <label className="flex items-center gap-1.5 text-sm text-slate-400" title="Dauer bis zur nächsten Szene">
          ⏱
          <select
            aria-label="Dauer bis zur nächsten Szene"
            className={inputClass}
            value={duration / 1000}
            disabled={isLastScene}
            title={isLastScene ? 'Die letzte Szene hat keinen Übergang' : undefined}
            onChange={(e) => setSceneDuration(Number(e.target.value) * 1000)}
          >
            {!DURATION_OPTIONS_S.includes(duration / 1000) && (
              <option value={duration / 1000}>{formatNumber(duration / 1000)} s</option>
            )}
            {DURATION_OPTIONS_S.map((s) => (
              <option key={s} value={s}>
                {formatNumber(s)} s
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
