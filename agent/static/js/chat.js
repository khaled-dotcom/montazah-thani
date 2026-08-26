/* ===========================================================================
   chat.js — منطق المحادثة المشترك بين صفحة /chat و الـ widget
   =========================================================================== */

(function () {
  "use strict";

  const root = document.getElementById("chatRoot");
  if (!root) return;

  const API_BASE      = root.dataset.apiBase || "";
  const STORAGE_KEY   = "alx_district_chat_session";
  const HISTORY_KEY   = "alx_district_chat_history";
  const MAX_HISTORY   = 40;

  const body        = document.getElementById("chatBody");
  const form        = document.getElementById("chatForm");
  const input       = document.getElementById("chatInput");
  const sendBtn     = document.getElementById("chatSend");
  const quickWrap   = document.getElementById("quickReplies");
  const districtSel = document.getElementById("districtSelect");
  const resetBtn    = document.getElementById("chatReset");

  let sessionId = null;
  let sending   = false;

  /* ── session ───────────────────────────────────────────────────────────── */

  function newSessionId() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID().replace(/-/g, "");
    }
    // متصفحات قديمة
    let s = "";
    for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
  }

  function loadSession() {
    let stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) { /* التخزين متوقف */ }

    if (!stored) {
      stored = newSessionId();
      try { localStorage.setItem(STORAGE_KEY, stored); } catch (e) { /* تجاهل */ }
    }
    return stored;
  }

  function resetSession() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) { /* تجاهل */ }

    sessionId = loadSession();
    body.innerHTML = "";
    renderWelcome();
    showQuickReplies();
  }

  /* ── history (عرض فقط — الذاكرة الحقيقية على السيرفر) ──────────────────── */

  function saveHistory(role, text, extra) {
    try {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      history.push(Object.assign({ role: role, text: text }, extra || {}));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
    } catch (e) { /* تجاهل */ }
  }

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  /* ── rendering ─────────────────────────────────────────────────────────── */

  function scrollToBottom() {
    body.scrollTop = body.scrollHeight;
  }

  function formatText(text) {
    // *نص* -> عريض، والباقي يتعرض كما هو (textContent يمنع أي HTML)
    const fragment = document.createDocumentFragment();
    const parts = String(text).split(/\*([^*\n]+)\*/g);

    parts.forEach(function (part, index) {
      if (index % 2 === 1) {
        const strong = document.createElement("strong");
        strong.textContent = part;
        fragment.appendChild(strong);
      } else if (part) {
        fragment.appendChild(document.createTextNode(part));
      }
    });

    return fragment;
  }

  function addMessage(role, text, extra) {
    extra = extra || {};

    const wrap = document.createElement("div");
    wrap.className = "msg " + role;

    const who = document.createElement("div");
    who.className = "who";
    who.textContent = role === "bot" ? "🏛️" : "👤";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.appendChild(formatText(text));

    if (extra.reference) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "reference-chip";
      chip.textContent = "📋 " + extra.reference;
      chip.title = "اضغط لنسخ الرقم";
      chip.addEventListener("click", function () {
        const done = function () {
          chip.textContent = "✅ تم نسخ الرقم";
          setTimeout(function () { chip.textContent = "📋 " + extra.reference; }, 1600);
        };
        if (navigator.clipboard) {
          navigator.clipboard.writeText(extra.reference).then(done, function () {});
        }
      });
      bubble.appendChild(document.createElement("br"));
      bubble.appendChild(chip);
    }

    if (extra.ticket_url) {
      const link = document.createElement("a");
      link.className = "ticket-link";
      link.href = extra.ticket_url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "🎫 عرض بطاقة الموعد";
      bubble.appendChild(document.createElement("br"));
      bubble.appendChild(link);
    }

    wrap.appendChild(who);
    wrap.appendChild(bubble);
    body.appendChild(wrap);
    scrollToBottom();

    return wrap;
  }

  function addTyping() {
    const wrap = document.createElement("div");
    wrap.className = "msg bot";
    wrap.id = "typingIndicator";

    const who = document.createElement("div");
    who.className = "who";
    who.textContent = "🏛️";

    const bubble = document.createElement("div");
    bubble.className = "bubble typing";
    bubble.appendChild(document.createElement("span"));
    bubble.appendChild(document.createElement("span"));
    bubble.appendChild(document.createElement("span"));

    wrap.appendChild(who);
    wrap.appendChild(bubble);
    body.appendChild(wrap);
    scrollToBottom();
  }

  function removeTyping() {
    const el = document.getElementById("typingIndicator");
    if (el) el.remove();
  }

  function addError(text) {
    const el = document.createElement("div");
    el.className = "chat-error";
    el.textContent = text;
    body.appendChild(el);
    scrollToBottom();
  }

  const WELCOME =
    "أهلاً بيك 👋\n" +
    "أنا مساعد خدمة المواطن. أقدر أساعدك في:\n\n" +
    "• تقديم بلاغ أو شكوى\n" +
    "• الاستعلام عن خدمة والأوراق المطلوبة\n" +
    "• حجز موعد لإنهاء معاملة\n" +
    "• متابعة حالة بلاغ أو موعد\n\n" +
    "اكتبلي محتاج إيه وأنا تحت أمرك.";

  function renderWelcome() {
    addMessage("bot", WELCOME);
  }

  /* ── quick replies ─────────────────────────────────────────────────────── */

  const QUICK_REPLIES = [
    "عايز أقدم بلاغ",
    "الأوراق المطلوبة لترخيص محل",
    "عايز أحجز ميعاد",
    "متابعة حالة بلاغ",
  ];

  function showQuickReplies() {
    if (!quickWrap) return;
    quickWrap.innerHTML = "";

    QUICK_REPLIES.forEach(function (label) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.addEventListener("click", function () {
        hideQuickReplies();
        send(label);
      });
      quickWrap.appendChild(btn);
    });
  }

  function hideQuickReplies() {
    if (quickWrap) quickWrap.innerHTML = "";
  }

  /* ── sending ───────────────────────────────────────────────────────────── */

  function currentDistrictId() {
    if (districtSel && districtSel.value) return parseInt(districtSel.value, 10);
    if (root.dataset.districtId) return parseInt(root.dataset.districtId, 10);
    return null;
  }

  function setSending(value) {
    sending = value;
    if (sendBtn) sendBtn.disabled = value;
    if (input) input.disabled = value;
  }

  function send(text) {
    text = (text || "").trim();
    if (!text || sending) return;

    hideQuickReplies();
    addMessage("user", text);
    saveHistory("user", text);

    input.value = "";
    autoGrow();
    setSending(true);
    addTyping();

    fetch(API_BASE + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        message: text,
        district_id: currentDistrictId(),
      }),
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, status: response.status, data: data };
        });
      })
      .then(function (result) {
        removeTyping();

        if (!result.ok) {
          addError(result.data.message || "حصل خطأ. حاول تاني.");
          return;
        }

        const extra = {
          reference: result.data.reference,
          ticket_url: result.data.ticket_url,
        };

        addMessage("bot", result.data.reply, extra);
        saveHistory("bot", result.data.reply, extra);
      })
      .catch(function () {
        removeTyping();
        addError("تعذر الاتصال بالخدمة. اطمن على الإنترنت وحاول تاني.");
      })
      .finally(function () {
        setSending(false);
        if (input) input.focus();
      });
  }

  /* ── composer behaviour ────────────────────────────────────────────────── */

  function autoGrow() {
    if (!input) return;
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 110) + "px";
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      send(input.value);
    });
  }

  if (input) {
    input.addEventListener("input", autoGrow);
    input.addEventListener("keydown", function (event) {
      // Enter يبعت، Shift+Enter بيعمل سطر جديد
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        send(input.value);
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      if (confirm("هتبدأ محادثة جديدة وهيتمسح الكلام السابق. تأكيد؟")) {
        resetSession();
      }
    });
  }

  if (districtSel) {
    districtSel.addEventListener("change", function () {
      try { localStorage.setItem("alx_district_choice", districtSel.value); } catch (e) {}
    });

    try {
      const saved = localStorage.getItem("alx_district_choice");
      if (saved && !districtSel.value) districtSel.value = saved;
    } catch (e) { /* تجاهل */ }
  }

  /* ── boot ──────────────────────────────────────────────────────────────── */

  sessionId = loadSession();

  const history = loadHistory();

  if (history.length) {
    history.forEach(function (item) {
      addMessage(item.role, item.text, item);
    });
  } else {
    renderWelcome();
    showQuickReplies();
  }

  if (input) input.focus();
})();
