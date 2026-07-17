// public/ai-chat-widget.js — ИИ-чат для калькулятора блок-модулей.
// Без библиотек: добавьте <script src="/ai-chat-widget.js" defer></script> перед </body>.
(function () {
  'use strict';

  // Тёплая палитра проекта
  var ACCENT = '#C2703D';      // терракотовый акцент
  var ACCENT_SOFT = '#D98E5F'; // светлый терракотовый (градиенты)
  var COCOA = '#3D2F26';       // основной текст
  var TAUPE = '#A08B7C';       // вторичный текст
  var SAND = '#EFE6DC';        // тёплые бордеры
  var CREAM = '#FAF7F3';       // фон

  var css = `
  #bm-chat-btn{position:fixed;right:20px;bottom:20px;width:58px;height:58px;border-radius:50%;
    background:linear-gradient(135deg,${ACCENT_SOFT} 0%,${ACCENT} 60%,#A85A2E 100%);color:#fff;border:none;cursor:pointer;z-index:99998;
    box-shadow:0 8px 22px rgba(194,112,61,.35);display:flex;align-items:center;justify-content:center;
    transition:transform .18s ease, box-shadow .18s ease;animation:bm-glow 3.2s ease-in-out infinite;}
  #bm-chat-btn:hover{transform:translateY(-2px) scale(1.04);animation-play-state:paused;
    box-shadow:0 12px 28px rgba(194,112,61,.45);}
  #bm-chat-btn:active{transform:scale(.97);}
  #bm-chat-btn svg{width:26px;height:26px;}
  @keyframes bm-glow{
    0%,100%{box-shadow:0 8px 22px rgba(194,112,61,.35);}
    50%{box-shadow:0 8px 26px rgba(194,112,61,.5),0 0 0 8px rgba(194,112,61,.10);}}
  #bm-chat-panel{position:fixed;right:20px;bottom:90px;width:384px;max-width:calc(100vw - 32px);
    height:560px;max-height:calc(100vh - 124px);background:#FDFBF8;border-radius:18px;z-index:99999;
    box-shadow:0 20px 56px rgba(61,47,38,.22),0 2px 8px rgba(61,47,38,.08);display:none;flex-direction:column;overflow:hidden;
    font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;border:1px solid ${SAND};}
  #bm-chat-panel.open{display:flex;animation:bm-panel-in .24s cubic-bezier(.2,.9,.3,1.1);}
  @keyframes bm-panel-in{from{opacity:0;transform:translateY(16px) scale(.98);}to{opacity:1;transform:none;}}
  .bm-chat-head{padding:14px 16px;background:linear-gradient(135deg,${ACCENT_SOFT} 0%,${ACCENT} 55%,#A85A2E 100%);
    display:flex;align-items:center;gap:11px;color:#fff;}
  .bm-chat-ava{flex:none;width:36px;height:36px;border-radius:12px;background:rgba(255,255,255,.18);
    display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25);}
  .bm-chat-head b{font-size:15px;font-weight:600;letter-spacing:.01em;display:block;line-height:1.2;}
  .bm-chat-head span{display:block;font-size:12px;color:rgba(255,255,255,.82);margin-top:1px;}
  .bm-chat-head>div{flex:1;min-width:0;}
  .bm-chat-close{flex:none;background:rgba(255,255,255,.14);border:none;width:28px;height:28px;border-radius:8px;
    font-size:17px;cursor:pointer;color:#fff;line-height:1;transition:background .15s;}
  .bm-chat-close:hover{background:rgba(255,255,255,.28);}
  .bm-chat-msgs{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:10px;background:${CREAM};
    scrollbar-width:thin;scrollbar-color:#D9C7B8 transparent;}
  .bm-chat-msgs::-webkit-scrollbar{width:6px;}
  .bm-chat-msgs::-webkit-scrollbar-thumb{background:#D9C7B8;border-radius:3px;}
  .bm-msg{max-width:84%;padding:10px 14px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;
    animation:bm-msg-in .18s ease-out;}
  @keyframes bm-msg-in{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
  .bm-msg.user{align-self:flex-end;background:linear-gradient(135deg,${ACCENT_SOFT},${ACCENT});color:#fff;
    border-radius:15px 15px 4px 15px;box-shadow:0 3px 10px rgba(194,112,61,.28);}
  .bm-msg.bot{align-self:flex-start;background:#fff;color:${COCOA};border:1px solid ${SAND};
    border-radius:15px 15px 15px 4px;box-shadow:0 2px 6px rgba(61,47,38,.06);}
  .bm-msg.err{align-self:flex-start;background:#FBEBE4;color:#A8402A;border:1px solid #F0D2C6;font-size:13px;
    border-radius:12px;}
  .bm-typing{align-self:flex-start;display:flex;align-items:center;gap:7px;color:${TAUPE};font-size:13px;
    background:#fff;border:1px solid ${SAND};border-radius:15px 15px 15px 4px;padding:9px 13px;
    box-shadow:0 2px 6px rgba(61,47,38,.06);}
  .bm-dots{display:inline-flex;gap:3px;}
  .bm-dots i{width:6px;height:6px;border-radius:50%;background:${ACCENT};animation:bm-bounce 1.1s infinite;}
  .bm-dots i:nth-child(2){animation-delay:.15s;}
  .bm-dots i:nth-child(3){animation-delay:.3s;}
  @keyframes bm-bounce{0%,60%,100%{transform:translateY(0);opacity:.35;}30%{transform:translateY(-4px);opacity:1;}}
  .bm-chat-input{display:flex;gap:9px;padding:12px;border-top:1px solid ${SAND};background:#FDF9F4;align-items:flex-end;}
  .bm-chat-input textarea{flex:1;resize:none;border:1px solid #E5D5C6;border-radius:12px;padding:10px 13px;
    font-size:14px;font-family:inherit;outline:none;max-height:96px;background:#fff;color:${COCOA};
    line-height:1.4;transition:border-color .15s, box-shadow .15s;}
  .bm-chat-input textarea:focus{border-color:${ACCENT};box-shadow:0 0 0 3px rgba(194,112,61,.14);}
  .bm-chat-input textarea::placeholder{color:#C4B3A4;}
  .bm-chat-input button{flex:none;width:42px;height:42px;border:none;border-radius:12px;cursor:pointer;color:#fff;
    background:linear-gradient(135deg,${ACCENT_SOFT},${ACCENT});display:flex;align-items:center;justify-content:center;
    box-shadow:0 3px 9px rgba(194,112,61,.3);transition:opacity .15s, transform .15s, box-shadow .15s;}
  .bm-chat-input button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 13px rgba(194,112,61,.4);}
  .bm-chat-input button:disabled{opacity:.45;cursor:default;}`;

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.id = 'bm-chat-btn';
  btn.title = 'ИИ-помощник';
  btn.setAttribute('aria-label', 'Открыть ИИ-помощника');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><circle cx="8.5" cy="11.5" r=".6" fill="currentColor"/><circle cx="12" cy="11.5" r=".6" fill="currentColor"/><circle cx="15.5" cy="11.5" r=".6" fill="currentColor"/></svg>';

  var panel = document.createElement('div');
  panel.id = 'bm-chat-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Чат с ИИ-помощником');
  panel.innerHTML =
    '<div class="bm-chat-head">' +
      '<span class="bm-chat-ava"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h.01M15 9h.01M9 15c.83.67 1.9 1 3 1s2.17-.33 3-1"/></svg></span>' +
      '<div><b>ИИ-помощник</b><span>Отвечу на вопросы о расчёте</span></div>' +
      '<button class="bm-chat-close" aria-label="Закрыть">×</button></div>' +
    '<div class="bm-chat-msgs"></div>' +
    '<div class="bm-chat-input"><textarea rows="1" placeholder="Например: почему позиция не участвует в расчёте?" aria-label="Сообщение помощнику"></textarea>' +
    '<button aria-label="Отправить"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></button></div>';

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var msgs = panel.querySelector('.bm-chat-msgs');
  var input = panel.querySelector('textarea');
  var sendBtn = panel.querySelector('.bm-chat-input button');
  var history = []; // [{role, content}] — последние сообщения для контекста
  var busy = false;

  // Мини-markdown для ответов модели: сначала экранируем HTML (безопасность),
  // затем **жирный** -> <strong>. Переносы строк обрабатывает CSS (pre-wrap).
  function renderLite(text) {
    var esc = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return esc.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  function addMsg(text, cls) {
    var el = document.createElement('div');
    el.className = 'bm-msg ' + cls;
    if (cls === 'bot') {
      el.innerHTML = renderLite(text);
    } else {
      el.textContent = text;
    }
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }

  function showTyping(label) {
    var el = document.createElement('div');
    el.className = 'bm-typing';
    el.innerHTML = '<span class="bm-typing-label"></span><span class="bm-dots"><i></i><i></i><i></i></span>';
    el.querySelector('.bm-typing-label').textContent = label || 'Печатает';
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }

  function setTypingLabel(el, label) {
    var l = el.querySelector('.bm-typing-label');
    if (l) l.textContent = label;
  }

  function growInput() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 96) + 'px';
  }

  function greet() {
    addMsg('Здравствуйте! Я помощник калькулятора блок-модулей. Подскажу, как устроен расчёт, что влияет на итог и как работают коэффициенты.', 'bot');
  }

  btn.addEventListener('click', function () {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      if (!history.length) greet();
      input.focus();
    }
  });
  panel.querySelector('.bm-chat-close').addEventListener('click', function () {
    panel.classList.remove('open');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('open')) panel.classList.remove('open');
  });

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  // Один запрос к /api/chat. Бросает ошибку с kind:
  //  'network' — fetch не выполнился (нет сети / обрыв);
  //  'bad-json' — ответ не JSON (платформа вернула HTML-страницу ошибки);
  //  'api'     — JSON с ошибкой API (4xx/5xx от нашего route handler).
  async function requestReply() {
    var resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-10) }),
    });
    var raw = await resp.text();
    var data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.warn('[bm-chat] Ответ не JSON, статус ' + resp.status + ':', raw.slice(0, 300));
      var err = new Error('Ответ сервера не JSON');
      err.kind = 'bad-json';
      err.status = resp.status;
      throw err;
    }
    if (!resp.ok) {
      console.warn('[bm-chat] Ошибка API ' + resp.status + ':', data);
      var err2 = new Error(data.error || 'Ошибка сервера');
      err2.kind = 'api';
      err2.status = resp.status;
      err2.userMessage = data.error;
      throw err2;
    }
    return data;
  }

  async function send() {
    var text = input.value.trim();
    if (!text || busy) return;
    busy = true;
    sendBtn.disabled = true;
    input.value = '';
    growInput();
    addMsg(text, 'user');
    history.push({ role: 'user', content: text });

    var typing = showTyping('Печатает');

    // Основная попытка + одна автоматическая повторная при любой ошибке.
    var data = null;
    var lastErr = null;
    for (var attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        setTypingLabel(typing, 'Повторяю');
        await sleep(1000);
      }
      try {
        data = await requestReply();
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        console.warn('[bm-chat] Попытка ' + (attempt + 1) + ' не удалась:', e);
      }
    }
    typing.remove();

    if (data) {
      addMsg(data.reply, 'bot');
      history.push({ role: 'assistant', content: data.reply });
      if (history.length > 12) history = history.slice(-12);
    } else if (lastErr && lastErr.kind === 'bad-json') {
      addMsg('Сервер временно недоступен (код ' + lastErr.status + '). Попробуйте через минуту.', 'err');
    } else if (lastErr && lastErr.kind === 'api') {
      addMsg(lastErr.userMessage || 'Ошибка сервера (код ' + lastErr.status + '). Попробуйте позже.', 'err');
    } else {
      addMsg('Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз.', 'err');
    }
    busy = false;
    sendBtn.disabled = false;
    input.focus();
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('input', growInput);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
})();
