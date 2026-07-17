// app/api/chat/route.ts — серверный прокси к бесплатным OpenAI-совместимым LLM API.
// Ключи живут только в env-переменных (Vercel), в браузер не попадают.
// Без единой env-переменной работает из коробки через Pollinations.

// Явный nodejs-рантайм (поддерживается для route handlers, см. docs route-segment-config)
// и лимит длительности функции: Vercel читает maxDuration из сборки и поднимает
// таймаут serverless-функции до 60 сек (иначе дефолт платформы может оборвать
// долгий ответ Pollinations HTML-страницей ошибки).
export const runtime = 'nodejs';
export const maxDuration = 60;

type ChatMessage = {
  role: string;
  content: string;
};

type ProviderName = 'openrouter' | 'github' | 'zai' | 'pollinations' | 'llm7';

interface ProviderConfig {
  baseUrl: string;
  model: string;
  /** Имя env-переменной с API-ключом (undefined — ключ не нужен). */
  apiKeyEnv?: string;
  extraHeaders?: Record<string, string>;
}

const PROVIDERS: Record<ProviderName, ProviderConfig> = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    extraHeaders: {
      'HTTP-Referer': 'https://bm-calculator-chi.vercel.app/',
      'X-Title': 'BM Calculator Assistant',
    },
  },
  github: {
    baseUrl: 'https://models.github.ai/inference',
    model: 'openai/gpt-4.1',
    apiKeyEnv: 'GITHUB_TOKEN',
  },
  zai: {
    baseUrl: 'https://api.z.ai/api/paas/v4',
    model: 'glm-4.7-flash',
    apiKeyEnv: 'ZAI_API_KEY',
  },
  pollinations: {
    baseUrl: 'https://text.pollinations.ai/openai',
    model: 'openai',
    // Ключ не нужен: Pollinations принимает любой Bearer-токен (проверено живым запросом).
  },
  llm7: {
    baseUrl: 'https://api.llm7.io/v1',
    model: 'default',
    // Анонимный доступ: Bearer "unused" (проверено живым запросом 17.07.2026).
  },
};

// Порядок перебора в режиме auto (когда AI_PROVIDER не задан).
const AUTO_PRIORITY: ProviderName[] = ['openrouter', 'github', 'zai', 'pollinations'];

// Провайдеры без ключа: автоматический запасной вариант, если основной лимитирован (429)
// или недоступен. В auto-режиме после основного пробуем оставшиеся из этого списка.
const KEYLESS_PROVIDERS: ProviderName[] = ['pollinations', 'llm7'];

const SYSTEM_PROMPT =
  'Ты — ИИ-помощник веб-приложения "Калькулятор себестоимости блок-модулей". ' +
  'Помогаешь разобраться с расчётом модульных зданий. ' +
  'Разделы: I — материалы (рамы, стойки, сэндвич-панели, крыша, окна, двери, отделка), ' +
  'I-доп — инженерные сети (площадь × тариф × коэффициент), II — наполнение комплектующими, ' +
  'III — сборка (завод/объект, спецтехника, монтаж ЭС/ВК, командировочные), ' +
  'IV — транспорт (фура/трал по городу), V — фундамент, VI — доп. услуги (проектирование, пуско-наладка). ' +
  'Правила: позиция с пустым/нулевым количеством или ценой не участвует в расчёте; ' +
  'коэффициент 1 = полная стоимость м²; Итого = Себестоимость + Прибыль 20% + НДС 22%. ' +
  'Отвечай кратко, по-русски, по делу.';

// Примитивный лимит: не больше DAILY_LIMIT сообщений с одного IP в сутки.
// На serverless это best-effort (память сбрасывается между «холодными» инстансами),
// но от случайного абуза спасает. Для жёсткого лимита подключите Vercel KV/Upstash.
const buckets = new Map<string, { day: string; count: number }>();
const DAILY_LIMIT = 30;

function isRateLimited(ip: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const rec = buckets.get(ip);
  if (!rec || rec.day !== today) {
    buckets.set(ip, { day: today, count: 1 });
    return false;
  }
  rec.count += 1;
  return rec.count > DAILY_LIMIT;
}

function isProviderName(value: string): value is ProviderName {
  return (
    value === 'openrouter' ||
    value === 'github' ||
    value === 'zai' ||
    value === 'pollinations' ||
    value === 'llm7'
  );
}

function apiKeyFor(name: ProviderName): string | null {
  const envName = PROVIDERS[name].apiKeyEnv;
  if (!envName) return null;
  const key = process.env[envName]?.trim();
  return key ? key : null;
}

type ProviderResolution =
  | { ok: true; name: ProviderName; apiKey: string | null }
  | { ok: false; error: string };

function resolveProvider(): ProviderResolution {
  const forced = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (forced) {
    if (!isProviderName(forced)) {
      return {
        ok: false,
        error: `Неизвестный AI_PROVIDER: "${forced}". Допустимые значения: openrouter, github, zai, pollinations.`,
      };
    }
    const apiKey = apiKeyFor(forced);
    if (!KEYLESS_PROVIDERS.includes(forced) && !apiKey) {
      return {
        ok: false,
        error: `AI_PROVIDER=${forced}, но не задана переменная окружения ${PROVIDERS[forced].apiKeyEnv}.`,
      };
    }
    return { ok: true, name: forced, apiKey };
  }

  // Режим auto: первый провайдер с ключом; Pollinations без ключа доступен всегда.
  for (const name of AUTO_PRIORITY) {
    const apiKey = apiKeyFor(name);
    if (name === 'pollinations' || apiKey) {
      return { ok: true, name, apiKey };
    }
  }
  // Недостижимо (pollinations всегда подходит), но нужен для строгой типизации.
  return { ok: true, name: 'pollinations', apiKey: null };
}

function isValidMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false;
  const msg = value as Record<string, unknown>;
  return typeof msg.role === 'string' && typeof msg.content === 'string';
}

export async function POST(request: Request) {
  // --- Лимит по IP ---
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return Response.json(
      { error: 'Дневной лимит сообщений исчерпан. Попробуйте завтра.' },
      { status: 429 },
    );
  }

  // --- Выбор провайдера ---
  const resolved = resolveProvider();
  if (!resolved.ok) {
    return Response.json({ error: `Сервер не настроен: ${resolved.error}` }, { status: 500 });
  }
  // --- Валидация входа ---
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Некорректный запрос: тело должно быть JSON с массивом messages.' },
      { status: 400 },
    );
  }
  const messages = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json(
      { error: 'Некорректный запрос: нужен непустой массив messages.' },
      { status: 400 },
    );
  }
  if (!messages.every(isValidMessage)) {
    return Response.json(
      { error: 'Некорректный формат сообщений: нужны объекты {role, content} со строками.' },
      { status: 400 },
    );
  }

  // --- Вызов LLM ---
  const makeBody = (model: string) =>
    JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.slice(-12), // не раздуваем контекст — бережём бесплатные токены
      ],
      temperature: 0.4,
      max_tokens: 1000,
    });

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // До двух попыток на провайдера. Повторяем при сетевой ошибке, таймауте, 5xx и 429
  // (после 429 ждём дольше — лимит успевает сброситься). Таймаут 12 сек ⇒
  // худший случай на провайдера ~28 сек, два keyless-провайдера ~56 сек < maxDuration (60).
  async function callProvider(
    name: ProviderName,
    apiKey: string | null,
  ): Promise<{ ok: true; reply: string } | { ok: false; status: number | null }> {
    const cfg = PROVIDERS[name];
    const body = makeBody(cfg.model);
    let lastStatus: number | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await sleep(lastStatus === 429 ? 4000 : 1000);
      try {
        const resp = await fetch(`${cfg.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Keyless-провайдеры (Pollinations, LLM7) принимают любой Bearer (по докам — "unused").
            Authorization: `Bearer ${apiKey ?? 'unused'}`,
            ...(cfg.extraHeaders ?? {}),
          },
          body,
          signal: AbortSignal.timeout(12_000),
        });
        lastStatus = resp.status;

        if (resp.status === 429 || resp.status >= 500) {
          console.error(`LLM upstream ${resp.status}, повтор (попытка ${attempt + 1})`, name);
          continue;
        }
        if (!resp.ok) {
          // 4xx (кроме 429) — смысла повторять нет (например, неверный ключ).
          const text = await resp.text();
          console.error('LLM upstream error', name, resp.status, text.slice(0, 300));
          return { ok: false, status: resp.status };
        }

        const data = (await resp.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const reply = data.choices?.[0]?.message?.content?.trim();
        if (!reply) {
          console.error('LLM empty reply', name);
          return { ok: false, status: resp.status };
        }
        return { ok: true, reply };
      } catch (err) {
        console.error('LLM fetch failed (попытка', attempt + 1, ')', name, err);
        lastStatus = null;
      }
    }
    return { ok: false, status: lastStatus };
  }

  // Цепочка: основной провайдер; в auto-режиме — затем остальные keyless-провайдеры.
  const forced = Boolean(process.env.AI_PROVIDER?.trim());
  const chain: ProviderName[] = forced
    ? [resolved.name]
    : [resolved.name, ...KEYLESS_PROVIDERS.filter((k) => k !== resolved.name)];

  let lastStatus: number | null = null;
  for (const name of chain) {
    const apiKey = name === resolved.name ? resolved.apiKey : apiKeyFor(name);
    const result = await callProvider(name, apiKey);
    if (result.ok) {
      return Response.json({ reply: result.reply });
    }
    lastStatus = result.status;
    console.error('Провайдер не ответил, пробуем следующий:', name, 'статус:', result.status);
  }

  if (lastStatus === 429) {
    return Response.json(
      {
        error:
          'Бесплатная модель сейчас перегружена запросами (429). Подождите 30–60 секунд и отправьте сообщение ещё раз. ' +
          'Чтобы убрать это ограничение насовсем, добавьте бесплатный ключ OPENROUTER_API_KEY в настройках Vercel.',
      },
      { status: 502 },
    );
  }
  return Response.json(
    { error: 'Не удалось получить ответ от модели. Попробуйте позже.' },
    { status: 502 },
  );
}
