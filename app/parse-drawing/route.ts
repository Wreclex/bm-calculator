// app/api/parse-drawing/route.ts — распознавание чертежа панели/здания.
// Режимы:
//   mode: "dxf"   — клиент уже распарсил DXF: извлечённые подписи и габариты
//                   анализирует ТЕКСТОВАЯ модель (работает без ключей: Pollinations/LLM7).
//   mode: "image" — dataURL картинки (PNG/JPG/отрендеренный PDF): нужна VISION-модель.
//                   Бесплатных vision-моделей без ключа не существует — нужен
//                   OPENROUTER_API_KEY (модель openrouter/free сама выберет зрячую)
//                   или GITHUB_TOKEN (openai/gpt-4.1). Без ключей → 422 NO_VISION_KEY.

export const runtime = "nodejs";
export const maxDuration = 60;

/* ---------------- типы ---------------- */

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

interface DxfPayload {
  texts: string[];
  numbers: number[];
  bboxMm: { w: number; h: number } | null;
}

const JSON_SCHEMA_HINT = `{
  "length_m": число|null,        // длина здания в метрах
  "width_m": число|null,         // ширина здания в метрах
  "floors": целое|null,          // этажность, если указана
  "footprint_area_m2": число|null, // площадь застройки
  "building_area_m2": число|null,  // общая площадь (все этажи)
  "panel_count": целое|null,       // количество панелей/блок-контейнеров, если определяется
  "panel_area_m2": число|null,     // суммарная площадь панелей, если определяется
  "sp_thickness_mm": число|null,   // толщина сэндвич-панели в мм (80/100/150/200), если указана
  "confidence": "high"|"medium"|"low",
  "notes": "строка"               // что удалось/не удалось понять, допущения (1-2 предложения)
}`;

const SYSTEM_PROMPT_DXF = `Ты — инженер-конструктор модульных зданий. Тебе дают текстовые подписи и габариты, извлечённые из DXF-чертежа панели/здания. Определи параметры здания.
Правила:
- DXF обычно в миллиметрах: 6000 мм = 6 м. Делим на 1000.
- Длина — больший горизонтальный размер, ширина — меньший.
- Если этажность не указана явно — null, не выдумывай.
- Площадь застройки = длина × ширина (если не подписана явно).
- Ответ СТРОГО одним JSON-объектом без markdown и комментариев, по схеме:
${JSON_SCHEMA_HINT}`;

const SYSTEM_PROMPT_IMAGE = `Ты — инженер-конструктор модульных зданий. Тебе дают изображение чертежа (панель, план или фасад модульного здания). Прочитай размерные подписи и определи параметры здания.
Правила:
- Размеры на чертежах обычно в миллиметрах: 6000 = 6 м.
- Длина — больший размер, ширина — меньший.
- Если что-то не читается — null, не выдумывай. Оценивай confidence честно.
- Ответ СТРОГО одним JSON-объектом без markdown и комментариев, по схеме:
${JSON_SCHEMA_HINT}`;

/* ---------------- провайдеры ---------------- */

interface TextProvider {
  name: string;
  baseUrl: string;
  model: string;
  apiKeyEnv?: string;
  vision?: boolean;
  extraHeaders?: Record<string, string>;
}

const PROVIDERS: TextProvider[] = [
  {
    name: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    apiKeyEnv: "OPENROUTER_API_KEY",
    vision: true, // для vision-запросов модель подменяется на openrouter/free
    extraHeaders: {
      "HTTP-Referer": "https://bm-calculator-chi.vercel.app/",
      "X-Title": "BM Calculator Drawing Parser",
    },
  },
  {
    name: "github",
    baseUrl: "https://models.github.ai/inference",
    model: "openai/gpt-4.1",
    apiKeyEnv: "GITHUB_TOKEN",
    vision: true,
  },
  { name: "zai", baseUrl: "https://api.z.ai/api/paas/v4", model: "glm-4.7-flash", apiKeyEnv: "ZAI_API_KEY" },
  { name: "pollinations", baseUrl: "https://text.pollinations.ai/openai", model: "openai" },
  { name: "llm7", baseUrl: "https://api.llm7.io/v1", model: "default" },
];

const keyOf = (env?: string) => (env ? process.env[env]?.trim() || null : null);

async function callLLM(
  p: TextProvider,
  apiKey: string | null,
  body: string,
): Promise<{ ok: true; text: string } | { ok: false; status: number | null }> {
  let lastStatus: number | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, lastStatus === 429 ? 4000 : 1000));
    try {
      const resp = await fetch(`${p.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey ?? "unused"}`,
          ...(p.extraHeaders ?? {}),
        },
        body,
        signal: AbortSignal.timeout(25_000),
      });
      lastStatus = resp.status;
      if (resp.status === 429 || resp.status >= 500) continue;
      if (!resp.ok) return { ok: false, status: resp.status };
      const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const text = data.choices?.[0]?.message?.content?.trim();
      return text ? { ok: true, text } : { ok: false, status: resp.status };
    } catch (err) {
      console.error("parse-drawing fetch failed", p.name, err);
      lastStatus = null;
    }
  }
  return { ok: false, status: lastStatus };
}

/* ---------------- разбор ответа модели ---------------- */

const clamp = (v: unknown, min: number, max: number): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

function sanitize(raw: unknown): ParsedResult {
  const o = (raw ?? {}) as Record<string, unknown>;
  const conf = o.confidence === "high" || o.confidence === "medium" ? o.confidence : "low";
  return {
    length_m: clamp(o.length_m, 1, 300),
    width_m: clamp(o.width_m, 1, 200),
    floors: clamp(o.floors, 1, 30),
    footprint_area_m2: clamp(o.footprint_area_m2, 1, 200000),
    building_area_m2: clamp(o.building_area_m2, 1, 1000000),
    panel_count: clamp(o.panel_count, 1, 100000),
    panel_area_m2: clamp(o.panel_area_m2, 1, 1000000),
    sp_thickness_mm: clamp(o.sp_thickness_mm, 30, 400),
    confidence: conf,
    notes: typeof o.notes === "string" ? o.notes.slice(0, 500) : "",
  };
}

function extractJson(text: string): unknown | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/* ---------------- handler ---------------- */

export async function POST(request: Request) {
  let body: { mode?: string; dataUrl?: string; dxf?: DxfPayload };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  /* ===== режим DXF: текстовая модель по извлечённым подписям ===== */
  if (body.mode === "dxf" && body.dxf && Array.isArray(body.dxf.texts)) {
    const { texts, numbers, bboxMm } = body.dxf;
    const userContent =
      `Текстовые подписи чертежа: ${JSON.stringify(texts.slice(0, 120))}\n` +
      `Числа из подписей (по убыванию): ${JSON.stringify(numbers.slice(0, 60))}\n` +
      (bboxMm
        ? `Габариты геометрии файла: ${Math.round(bboxMm.w)} × ${Math.round(bboxMm.h)} (в единицах DXF, обычно мм)\n`
        : "Геометрия не найдена, только подписи.\n") +
      "Определи параметры и верни JSON.";

    const reqBody = (model: string) =>
      JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT_DXF },
          { role: "user", content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 800,
      });

    for (const p of PROVIDERS) {
      const key = keyOf(p.apiKeyEnv);
      if (p.apiKeyEnv && !key) continue; // нет ключа — пропускаем
      const r = await callLLM(p, key, reqBody(p.model));
      if (!r.ok) continue;
      const parsed = extractJson(r.text);
      if (!parsed) continue;
      return Response.json({ result: sanitize(parsed), provider: p.name });
    }
    return Response.json(
      { error: "Модель не смогла разобрать чертёж. Попробуйте ещё раз или введите размеры вручную." },
      { status: 502 },
    );
  }

  /* ===== режим image: нужна vision-модель (только с ключом) ===== */
  if (body.mode === "image" && typeof body.dataUrl === "string") {
    if (body.dataUrl.length > 6_000_000) {
      return Response.json(
        { error: "Изображение слишком большое. Сожмите или обрежьте чертёж." },
        { status: 413 },
      );
    }

    const visionProviders = PROVIDERS.filter((p) => p.vision && keyOf(p.apiKeyEnv));
    if (visionProviders.length === 0) {
      return Response.json(
        {
          code: "NO_VISION_KEY",
          error:
            "Для распознавания картинок и PDF нужна «зрячая» модель. Добавьте бесплатный ключ OPENROUTER_API_KEY в настройках Vercel (3 минуты). DXF-файлы распознаются и без ключа.",
        },
        { status: 422 },
      );
    }

    for (const p of visionProviders) {
      const model =
        p.name === "openrouter"
          ? process.env.AI_VISION_MODEL?.trim() || "openrouter/free" // роутер сам выберет бесплатную зрячую модель
          : p.model;
      const reqBody = JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT_IMAGE },
          {
            role: "user",
            content: [
              { type: "text", text: "Прочитай этот чертёж и верни JSON с параметрами." },
              { type: "image_url", image_url: { url: body.dataUrl } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 800,
      });
      const r = await callLLM(p, keyOf(p.apiKeyEnv), reqBody);
      if (!r.ok) continue;
      const parsed = extractJson(r.text);
      if (!parsed) continue;
      return Response.json({ result: sanitize(parsed), provider: p.name });
    }
    return Response.json(
      { error: "Не удалось распознать изображение. Попробуйте более чёткий чертёж." },
      { status: 502 },
    );
  }

  return Response.json(
    { error: "Нужен mode: 'dxf' с полем dxf или mode: 'image' с полем dataUrl." },
    { status: 400 },
  );
}
