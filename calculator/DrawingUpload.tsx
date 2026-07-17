"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp, Loader2, CheckCircle2, AlertTriangle, KeyRound, X } from "lucide-react";
import { parseDxf } from "./dxf";

/* Значения, которые можно перенести из чертежа в форму. */
export interface DrawingApplyValues {
  buildingLength?: number | null;
  buildingWidth?: number | null;
  floors?: number | null;
  footprintArea?: number | null;
  totalArea?: number | null;
  spThickness?: number | null;
}

interface ParsedResult {
  length_m: number | null;
  width_m: number | null;
  floors: number | null;
  footprint_area_m2: number | null;
  building_area_m2: number | null;
  panel_count: number | null;
  panel_area_m2: number | null;
  sp_thickness_mm: number | null;
  confidence: "high" | "medium" | "low";
  notes: string;
}

type Status =
  | { kind: "idle" }
  | { kind: "working"; label: string }
  | { kind: "parsed"; result: ParsedResult; fileName: string; provider: string }
  | { kind: "needkey" }
  | { kind: "error"; message: string };

const CONF_LABEL = { high: "Высокая точность", medium: "Средняя точность", low: "Низкая точность — проверьте" } as const;

const fieldCls =
  "w-full rounded-lg border border-sand-dark bg-field px-2.5 py-1.5 text-right text-sm tabular-nums " +
  "text-cocoa shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] outline-none transition " +
  "focus:border-terra focus:ring-2 focus:ring-terra/15";

/* Сжать картинку до dataURL (≤1600px по длинной стороне, JPEG 0.85). */
async function fileToDataUrl(file: File | Blob): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

/* PDF → dataURL первой страницы (pdfjs, lazy-загрузка; без воркера — fake worker). */
async function pdfToDataUrl(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
  void pdf.destroy();
  // повторно сжимаем через общий путь
  const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/png")!);
  return fileToDataUrl(blob);
}

export default function DrawingUpload({ onApply }: { onApply: (v: DrawingApplyValues) => void }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const process = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    if (ext === "dwg") {
      setStatus({
        kind: "error",
        message:
          "DWG — закрытый бинарный формат, браузер его не читает. Экспортируйте чертёж из AutoCAD в DXF или PDF и загрузите снова.",
      });
      return;
    }

    try {
      if (ext === "dxf") {
        setStatus({ kind: "working", label: "Читаю DXF…" });
        const text = await file.text();
        const dxf = parseDxf(text);
        if (!dxf.texts.length && !dxf.bboxMm) {
          setStatus({ kind: "error", message: "В DXF не нашлось ни подписей, ни геометрии. Проверьте файл." });
          return;
        }
        setStatus({ kind: "working", label: "ИИ анализирует размеры…" });
        const resp = await fetch("/api/parse-drawing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "dxf", dxf }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || `Ошибка ${resp.status}`);
        setStatus({ kind: "parsed", result: data.result, fileName: file.name, provider: data.provider });
        return;
      }

      if (["png", "jpg", "jpeg", "webp"].includes(ext) || ext === "pdf") {
        setStatus({ kind: "working", label: ext === "pdf" ? "Рендерю PDF…" : "Сжимаю изображение…" });
        const dataUrl = ext === "pdf" ? await pdfToDataUrl(file) : await fileToDataUrl(file);
        setStatus({ kind: "working", label: "ИИ распознаёт чертёж…" });
        const resp = await fetch("/api/parse-drawing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "image", dataUrl }),
        });
        const data = await resp.json();
        if (resp.status === 422 && data.code === "NO_VISION_KEY") {
          setStatus({ kind: "needkey" });
          return;
        }
        if (!resp.ok) throw new Error(data.error || `Ошибка ${resp.status}`);
        setStatus({ kind: "parsed", result: data.result, fileName: file.name, provider: data.provider });
        return;
      }

      setStatus({
        kind: "error",
        message: "Поддерживаются: PNG, JPG, WEBP, PDF, DXF. DWG — только после экспорта в DXF/PDF.",
      });
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Не удалось обработать файл." });
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const f = e.dataTransfer.files?.[0];
      if (f) void process(f);
    },
    [process],
  );

  const reset = () => {
    setStatus({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="mt-4">
      {/* Зона загрузки */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          drag ? "border-terra bg-terra-50" : "border-sand-dark bg-parchment hover:border-terra/50 hover:bg-terra-50/50"
        }`}
      >
        <FileUp className="h-6 w-6 text-terra" />
        <p className="text-sm font-medium text-cocoa">
          Чертёж панели или здания — перетащите сюда или{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-terra underline decoration-terra/40 underline-offset-2 hover:text-terra-dark"
          >
            выберите файл
          </button>
        </p>
        <p className="text-xs text-taupe">
          PNG, JPG, WEBP, PDF, DXF · ИИ сам посчитает площади, размеры и количество панелей
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf,.dxf,.dwg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void process(f);
          }}
        />
      </div>

      {/* Прогресс */}
      {status.kind === "working" && (
        <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-terra-50 px-4 py-3 text-sm text-terra-dark ring-1 ring-terra-100">
          <Loader2 className="h-4 w-4 animate-spin" /> {status.label}
        </div>
      )}

      {/* Ошибка */}
      {status.kind === "error" && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <span className="flex-1">{status.message}</span>
          <button type="button" onClick={reset} className="text-red-400 hover:text-red-600" aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Нет vision-ключа */}
      {status.kind === "needkey" && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold">
            <KeyRound className="h-4 w-4" /> Для распознавания картинок и PDF нужен бесплатный ключ
          </p>
          <p className="mt-1.5 leading-relaxed">
            «Зрячие» модели без ключа не бывают. Заведите бесплатный ключ на{" "}
            <b>openrouter.ai</b> (регистрация email/GitHub, без карты) и добавьте его в Vercel как{" "}
            <code className="rounded bg-amber-100 px-1">OPENROUTER_API_KEY</code> — распознавание заработает.
            А <b>DXF-файлы распознаются уже сейчас, без ключа</b>.
          </p>
          <button type="button" onClick={reset} className="mt-2 text-xs font-medium text-amber-700 underline underline-offset-2">
            Понятно
          </button>
        </div>
      )}

      {/* Карточка распознанного */}
      {status.kind === "parsed" && (
        <ParsedCard
          result={status.result}
          fileName={status.fileName}
          onApply={(v) => {
            onApply(v);
            reset();
          }}
          onCancel={reset}
        />
      )}
    </div>
  );
}

/* ---------- карточка подтверждения ---------- */

function ParsedCard({
  result,
  fileName,
  onApply,
  onCancel,
}: {
  result: ParsedResult;
  fileName: string;
  onApply: (v: DrawingApplyValues) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState(result);
  const numOrNull = (s: string) => {
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const set = (k: keyof ParsedResult) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((p) => ({ ...p, [k]: numOrNull(e.target.value) }));

  const fields: { key: keyof ParsedResult; label: string; apply: boolean }[] = [
    { key: "length_m", label: "Длина здания, м", apply: true },
    { key: "width_m", label: "Ширина здания, м", apply: true },
    { key: "floors", label: "Кол-во этажей", apply: true },
    { key: "footprint_area_m2", label: "Площадь застройки, м²", apply: true },
    { key: "building_area_m2", label: "Общая площадь, м²", apply: true },
    { key: "sp_thickness_mm", label: "Толщина СП, мм", apply: true },
    { key: "panel_count", label: "Кол-во панелей, шт (справочно)", apply: false },
    { key: "panel_area_m2", label: "Площадь панелей, м² (справочно)", apply: false },
  ];

  return (
    <div className="mt-3 rounded-xl border border-terra-100 bg-terra-50/60 p-4 ring-1 ring-terra-100/50">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-cocoa">
          <CheckCircle2 className="h-4 w-4 text-terra" />
          Распознано из «{fileName}»
        </p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            v.confidence === "high"
              ? "bg-emerald-100 text-emerald-800"
              : v.confidence === "medium"
                ? "bg-amber-100 text-amber-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {CONF_LABEL[v.confidence]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-[11px] font-medium text-taupe">{f.label}</span>
            <input
              type="number"
              min="0"
              step="any"
              value={(v[f.key] as number | null) ?? ""}
              onChange={set(f.key)}
              className={fieldCls + (f.apply ? "" : " opacity-70")}
            />
          </label>
        ))}
      </div>

      {v.notes && <p className="mt-3 text-xs leading-relaxed text-taupe">ИИ: {v.notes}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            onApply({
              buildingLength: v.length_m,
              buildingWidth: v.width_m,
              floors: v.floors,
              footprintArea: v.footprint_area_m2,
              totalArea: v.building_area_m2,
              spThickness: v.sp_thickness_mm,
            })
          }
          className="rounded-lg bg-terra px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-terra-dark"
        >
          Применить к расчёту
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-sand-dark bg-card px-4 py-2 text-sm font-medium text-cocoa-soft transition hover:bg-terra-50"
        >
          Отмена
        </button>
      </div>
      <p className="mt-2 text-[11px] text-taupe">
        Применятся только заполненные поля. Панели — справочно (для панелей задайте цены в Разделе I).
      </p>
    </div>
  );
}
