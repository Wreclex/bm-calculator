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

type ProviderName = 'openrouter' | 'github' | 'zai' | 'pollinations';

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
};

// Порядок перебора в режиме auto (когда AI_PROVIDER не задан).
const AUTO_PRIORITY: ProviderName[] = ['openrouter', 'github', 'zai', 'pollinations'];

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
  return value === 'openrouter' || value === 'github' || value === 'zai' || value === 'pollinations';
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
    if (forced !== 'pollinations' && !apiKey) {
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
  const provider = PROVIDERS[resolved.name];

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
  const requestBody = JSON.stringify({
    model: provider.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-12), // не раздуваем контекст — бережём бесплатные токены
    ],
    temperature: 0.4,
    max_tokens: 1000,
  });

  // До двух попыток: основная + один повтор при сетевой ошибке/таймауте/5xx (пауза 1 сек).
  // Таймаут апстрима 20 сек ⇒ худший случай ~41 сек < maxDuration (60).
  const fetchWithRetry = async (): Promise<Response> => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 1000));
      try {
        const resp = await fetch(`${provider.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Для Pollinations ключа нет — подставляем любую строку, сервис её принимает.
            Authorization: `Bearer ${resolved.apiKey ?? 'anonymous'}`,
            ...(provider.extraHeaders ?? {}),
          },
          body: requestBody,
          signal: AbortSignal.timeout(20_000), // таймаут 20 сек на ответ модели
        });
        // 5xx — проблема на стороне провайдера, повторяем один раз.
        if (resp.status >= 500 && attempt === 0) {
          console.error('LLM upstream 5xx, повторяем', resolved.name, resp.status);
          continue;
        }
        return resp;
      } catch (err) {
        // Сетевая ошибка или таймаут — один повтор.
        console.error('LLM fetch failed (попытка', attempt + 1, ')', resolved.name, err);
        lastErr = err;
      }
    }
    throw lastErr;
  };

  try {
    const upstream = await fetchWithRetry();

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error('LLM upstream error', resolved.name, upstream.status, text.slice(0, 500));
      return Response.json(
        { error: `Модель временно недоступна (${upstream.status}). Попробуйте позже.` },
        { status: 502 },
      );
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = data.choices?.[0]?.message?.content?.trim();
    return Response.json({ reply: reply || 'Модель вернула пустой ответ.' });
  } catch (err) {
    // Сетевая ошибка или таймаут при обращении к провайдеру.
    console.error('LLM request failed', resolved.name, err);
    return Response.json(
      { error: 'Не удалось получить ответ от модели. Попробуйте позже.' },
      { status: 502 },
    );
  }
}
