import { useEffect, useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import {
  FIELD_VARIANTS,
  fieldVariantDrill,
  formatName,
  SIZE_FORMATS,
  sizeFormatDrill,
  sizeOverviewDrill,
  Y_PASS_VARIANTS,
  yPassDrill,
} from "../model/fieldTemplates";
import {
  EXTRA_GROUPS,
  EXTRA_TEMPLATES,
  extraTemplateDrill,
} from "../model/extraTemplates";
import {
  FANGO_GROUPS,
  FANGO_TEMPLATES,
  fangoTemplateDrill,
} from "../model/fangoTemplates";
import type { Drill } from "../model/types";
import { buttonClass } from "./ui";

const tileClass =
  "flex min-h-12 flex-col items-start justify-center rounded-md bg-slate-800 px-3 py-1.5 text-left text-sm text-slate-100 transition-colors hover:bg-slate-700";

/**
 * Choice of ready-made training fields: field sizes 1:1–9:9, goal variants, Y-pass and more
 * (set "fields"), or the templates from the coach's own drawings (set "fango").
 */
export function FieldTemplateDialog({
  onChoose,
  onClose,
  set = "fields",
}: {
  onChoose: (drill: Drill) => void;
  onClose: () => void;
  set?: "fields" | "fango";
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="field-templates-title"
        className="outline-none flex max-h-full w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
      >
        <h2
          id="field-templates-title"
          className="text-base font-semibold text-white"
        >
          {set === "fango" ? "Fango Grafiken" : "Trainingsfelder"}
        </h2>
        <p className="-mt-2 text-xs text-slate-400">
          Startet eine neue Übung mit diesem Feld. Alles lässt sich danach
          verändern.
        </p>

        {set === "fango" &&
          FANGO_GROUPS.map(({ group, title }) => (
            <section key={group} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-slate-300">{title}</h3>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {FANGO_TEMPLATES.filter((t) => t.group === group).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={tileClass}
                    onClick={() => onChoose(fangoTemplateDrill(t.key))}
                  >
                    <span className="font-semibold">{t.name}</span>
                    <span className="text-xs text-slate-400">{t.hint}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        {set === "fields" && (
          <>
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-slate-300">
                Feldgrößen (Spieler je Team, Tor zu Tor × Breite)
              </h3>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                {SIZE_FORMATS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={tileClass}
                    onClick={() => onChoose(sizeFormatDrill(f))}
                  >
                    <span className="font-semibold">{formatName(f)}</span>
                    <span className="text-xs text-slate-400">
                      {f.length[0]}–{f.length[1]} × {f.width[0]}–{f.width[1]} m
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  className={tileClass}
                  onClick={() => onChoose(sizeOverviewDrill())}
                >
                  <span className="font-semibold">Übersicht</span>
                  <span className="text-xs text-slate-400">
                    1:1 bis 8:8 auf einem Blatt
                  </span>
                </button>
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-slate-300">
                Feld- und Torvarianten
              </h3>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {FIELD_VARIANTS.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    className={tileClass}
                    onClick={() => onChoose(fieldVariantDrill(v.key))}
                  >
                    <span className="font-semibold">{v.name}</span>
                    <span className="text-xs text-slate-400">{v.hint}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-slate-300">
                Y-Pass-Varianten
              </h3>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {Y_PASS_VARIANTS.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    className={tileClass}
                    onClick={() => onChoose(yPassDrill(v.key))}
                  >
                    <span className="font-semibold">{v.name}</span>
                    <span className="text-xs text-slate-400">{v.hint}</span>
                  </button>
                ))}
              </div>
            </section>

            {EXTRA_GROUPS.map(({ group, title }) => (
              <section key={group} className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-slate-300">{title}</h3>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {EXTRA_TEMPLATES.filter((t) => t.group === group).map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      className={tileClass}
                      onClick={() => onChoose(extraTemplateDrill(t.key))}
                    >
                      <span className="font-semibold">{t.name}</span>
                      <span className="text-xs text-slate-400">{t.hint}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}

        <div className="flex justify-end">
          <button type="button" className={buttonClass} onClick={onClose}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
