// public/ai-chat-widget.js — ИИ-чат для калькулятора блок-модулей.
// Без библиотек: добавьте <script src="/ai-chat-widget.js" defer></script> перед </body>.
(function () {
  'use strict';

  var ACCENT = '#C2703D'; // терракотовый акцент — поменяйте под свой дизайн

  var css = `
  #bm-chat-btn{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;
    background:${ACCENT};color:#fff;border:none;cursor:pointer;z-index:99998;
    box-shadow:0 6px 20px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;
    transition:transform .15s ease, box-shadow .15s ease;}
  #bm-chat-btn:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(0,0,0,.22);}
  #bm-chat-panel{position:fixed;right:20px;bottom:88px;width:380px;max-width:calc(100vw - 32px);
    height:540px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;z-index:99999;
    box-shadow:0 16px 48px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden;
    font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;border:1px solid #eee2d8;}
  #bm-chat-panel.open{display:flex;}
  .bm-chat-head{padding:14px 16px;background:#faf6f2;border-bottom:1px solid #eee2d8;
    display:flex;align-items:center;justify-content:space-between;}
  .bm-chat-head b{font-size:15px;color:#3d2f26;font-weight:600;}
  .bm-chat-head span{display:block;font-size:12px;color:#a08b7c;}
  .bm-chat-close{background:none;border:none;font-size:20px;cursor:pointer;color:#a08b7c;line-height:1;}
  .bm-chat-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#fffdfB;}
  .bm-msg{max-width:82%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word;}
  .bm-msg.user{align-self:flex-end;background:${ACCENT};color:#fff;border-bottom-right-radius:4px;}
  .bm-msg.bot{align-self:flex-start;background:#f5efe9;color:#3d2f26;border-bottom-left-radius:4px;}
  .bm-msg.err{align-self:flex-start;background:#fdecea;color:#a33;font-size:13px;}
  .bm-typing{align-self:flex-start;color:#a08b7c;font-size:13px;padding:4px 8px;}
  .bm-chat-input{display:flex;gap:8px;padding:12px;border-top:1px solid #eee2d8;background:#faf6f2;}
  .bm-chat-input textarea{flex:1;resize:none;border:1px solid #e5d8cc;border-radius:10px;padding:9px 12px;
    font-size:14px;font-family:inherit;outline:none;max-height:90px;background:#fff;}
  .bm-chat-input textarea:focus{border-color:${ACCENT};}
  .bm-chat-input button{background:${ACCENT};color:#fff;border:none;border-radius:10px;padding:0 16px;
    font-size:15px;cursor:pointer;transition:opacity .15s;}
  .bm-chat-input button:disabled{opacity:.5;cursor:default;}`;

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.id = 'bm-chat-btn';
  btn.title = 'ИИ-помощник';
  btn.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

  var panel = document.createElement('div');
  panel.id = 'bm-chat-panel';
  panel.innerHTML =
    '<div class="bm-chat-head"><div><b>ИИ-помощник</b><span>Отвечу на вопросы о расчёте</span></div>' +
    '<button class="bm-chat-close" aria-label="Закрыть">×</button></div>' +
    '<div class="bm-chat-msgs"></div>' +
    '<div class="bm-chat-input"><textarea rows="1" placeholder="Например: почему позиция не участвует в расчёте?"></textarea>' +
    '<button>➤</button></div>';

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var msgs = panel.querySelector('.bm-chat-msgs');
  var input = panel.querySelector('textarea');
  var sendBtn = panel.querySelector('.bm-chat-input button');
  var history = []; // [{role, content}] — последние сообщения для контекста
  var busy = false;

  function addMsg(text, cls) {
    var el = document.createElement('div');
    el.className = 'bm-msg ' + cls;
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }

  function greet() {
    addMsg('Здравствуйте! Я помощник калькулятора блок-модулей. Подскажу, как устроен расчёт, что влияет на итог и как работают коэффициенты.', 'bot');
  }

  btn.addEventListener('click', function () {
    panel.classList.toggle('open');
    if (panel.classList.contains('open') && !history.length) greet();
    input.focus();
  });
  panel.querySelector('.bm-chat-close').addEventListener('click', function () {
    panel.classList.remove('open');
  });

  async function send() {
    var text = input.value.trim();
    if (!text || busy) return;
    busy = true;
    sendBtn.disabled = true;
    input.value = '';
    addMsg(text, 'user');
    history.push({ role: 'user', content: text });

    var typing = document.createElement('div');
    typing.className = 'bm-typing';
    typing.textContent = 'Печатает…';
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;

    try {
      var resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-10) }),
      });
      var data = await resp.json();
      typing.remove();
      if (!resp.ok) {
        addMsg(data.error || 'Ошибка сервера.', 'err');
      } else {
        addMsg(data.reply, 'bot');
        history.push({ role: 'assistant', content: data.reply });
        if (history.length > 12) history = history.slice(-12);
      }
    } catch (e) {
      typing.remove();
      addMsg('Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз.', 'err');
    }
    busy = false;
    sendBtn.disabled = false;
    input.focus();
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
})();
