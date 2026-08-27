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

  /* ── الفورمات ──────────────────────────────────────────────────────────────
     البوت بيرجّع وصف فورم (حجز موعد / بلاغ) بدل ما يسأل على الحقول واحد
     واحد. الرسم هنا عام: بيمشي على الحقول اللي وصلت مهما كانت، فإضافة حقل
     في graph/forms.py ما بتحتاجش تعديل هنا.

     الفورمات مش بتتخزن في الـ history المحلي عن قصد — فورم قديم بمواعيد
     بايتة أسوأ من مفيش فورم، والمواطن يقدر يطلب واحد جديد بكلمة. */

  function fieldOptions(field, values) {
    if (!field.optionsBy) return field.options || [];
    return (field.optionsByValue || {})[values[field.optionsBy] || ""] || [];
  }

  function labelFor(field, id) {
    const label = document.createElement("label");
    label.className = "cf-label";
    label.setAttribute("for", id);
    label.textContent = field.label;

    if (field.required) {
      const star = document.createElement("span");
      star.className = "cf-req";
      star.textContent = " *";
      star.setAttribute("aria-hidden", "true");
      label.appendChild(star);
    } else {
      const opt = document.createElement("span");
      opt.className = "cf-opt";
      opt.textContent = " (اختياري)";
      label.appendChild(opt);
    }

    return label;
  }

  function removeOpenForms() {
    const open = body.querySelectorAll("form.chat-form");
    for (let i = 0; i < open.length; i++) open[i].remove();
  }

  function addFormCard(descriptor) {
    const values = {};
    const controls = {};      // اسم الحقل -> دالة إعادة رسم (للحقول المرتبطة)
    const errorNodes = {};

    (descriptor.fields || []).forEach(function (field) {
      values[field.name] = field.value || "";
    });

    const card = document.createElement("form");
    card.className = "chat-form";
    card.noValidate = true;

    const title = document.createElement("p");
    title.className = "cf-title";
    title.textContent = descriptor.title || "";
    card.appendChild(title);

    if (descriptor.intro) {
      const intro = document.createElement("p");
      intro.className = "cf-intro";
      intro.textContent = descriptor.intro;
      card.appendChild(intro);
    }

    if (descriptor.unavailable) {
      const warn = document.createElement("p");
      warn.className = "cf-error";
      warn.textContent = descriptor.unavailable;
      card.appendChild(warn);
      body.appendChild(card);
      scrollToBottom();
      return;
    }

    function setValue(name, value) {
      values[name] = value;
      clearError(name);

      // تغيير اليوم بيلغي الوقت المختار — الخيارات اتغيرت
      (descriptor.fields || []).forEach(function (field) {
        if (field.optionsBy === name) {
          values[field.name] = "";
          if (controls[field.name]) controls[field.name]();
        }
      });
    }

    function clearError(name) {
      const node = errorNodes[name];
      if (node) {
        node.textContent = "";
        node.hidden = true;
      }
    }

    function showErrors(fields) {
      Object.keys(errorNodes).forEach(clearError);
      Object.keys(fields || {}).forEach(function (name) {
        const node = errorNodes[name];
        if (node) {
          node.textContent = fields[name];
          node.hidden = false;
        }
      });
    }

    (descriptor.fields || []).forEach(function (field) {
      const row = document.createElement("div");
      row.className = "cf-row";

      const id = "cf-" + descriptor.kind + "-" + field.name;

      const error = document.createElement("p");
      error.className = "cf-error";
      error.id = id + "-err";
      error.hidden = true;
      errorNodes[field.name] = error;

      if (field.type === "fixed") {
        const name = document.createElement("span");
        name.className = "cf-label";
        name.textContent = field.label;

        const value = document.createElement("p");
        value.className = "cf-fixed";
        value.textContent = values[field.name];

        row.appendChild(name);
        row.appendChild(value);
        row.appendChild(error);
        card.appendChild(row);
        return;
      }

      if (field.type === "chips") {
        const name = document.createElement("span");
        name.className = "cf-label";
        name.textContent = field.label + (field.required ? " *" : "");
        row.appendChild(name);

        const group = document.createElement("div");
        group.className = "cf-chips";
        group.setAttribute("role", "group");
        group.setAttribute("aria-label", field.label);
        row.appendChild(group);

        controls[field.name] = function draw() {
          group.innerHTML = "";
          const options = fieldOptions(field, values);

          if (!options.length) {
            const empty = document.createElement("p");
            empty.className = "cf-hint";
            empty.textContent = field.optionsBy ? "اختار اليوم الأول" : "—";
            group.appendChild(empty);
            return;
          }

          options.forEach(function (option) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "cf-chip";
            chip.textContent = option.label;
            chip.setAttribute(
              "aria-pressed", values[field.name] === option.value ? "true" : "false"
            );
            if (values[field.name] === option.value) chip.classList.add("is-on");
            chip.addEventListener("click", function () {
              setValue(field.name, option.value);
              draw();
            });
            group.appendChild(chip);
          });
        };

        controls[field.name]();
        row.appendChild(error);
        card.appendChild(row);
        return;
      }

      row.appendChild(labelFor(field, id));

      let control;

      if (field.type === "textarea") {
        control = document.createElement("textarea");
        control.rows = field.rows || 3;
      } else if (field.type === "select") {
        control = document.createElement("select");

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "اختار…";
        control.appendChild(placeholder);

        (field.options || []).forEach(function (option) {
          const node = document.createElement("option");
          node.value = option.value;
          node.textContent = option.label;
          control.appendChild(node);
        });

        if (field.allowOther) {
          const other = document.createElement("option");
          other.value = "__other__";
          other.textContent = field.otherLabel || "غير كده";
          control.appendChild(other);
        }
      } else {
        control = document.createElement("input");
        control.type =
          field.type === "tel" ? "tel" : field.type === "email" ? "email" : "text";
        if (field.placeholder) control.placeholder = field.placeholder;
        if (field.inputMode) control.inputMode = field.inputMode;
        if (field.autoComplete) control.autocomplete = field.autoComplete;
      }

      control.id = id;
      control.className = "cf-control";
      control.value = values[field.name];
      if (field.maxLength) control.maxLength = field.maxLength;

      /* قيمة متملّية مش موجودة في القايمة معناها الموديل لقى خدمة الحي
         ما سجّلهاش — نبدأ بخانة كتابة حرة بدل ما نضيّع اللي طلبه */
      if (field.type === "select" && field.allowOther && values[field.name]) {
        const known = (field.options || []).some(function (o) {
          return o.value === values[field.name];
        });
        if (!known) control.value = "__other__";
      }

      control.addEventListener("change", function () {
        if (field.type === "select" && control.value === "__other__") {
          const typed = document.createElement("input");
          typed.type = "text";
          typed.id = id;
          typed.className = "cf-control";
          typed.value = values[field.name] || "";
          if (field.maxLength) typed.maxLength = field.maxLength;
          typed.addEventListener("input", function () {
            setValue(field.name, typed.value);
          });
          control.replaceWith(typed);
          typed.focus();
          setValue(field.name, "");
          return;
        }
        setValue(field.name, control.value);
      });

      control.addEventListener("input", function () {
        setValue(field.name, control.value);
      });

      row.appendChild(control);

      if (field.hint) {
        const hint = document.createElement("p");
        hint.className = "cf-hint";
        hint.textContent = field.hint;
        row.appendChild(hint);
      }

      row.appendChild(error);
      card.appendChild(row);
    });

    const status = document.createElement("p");
    status.className = "cf-error";
    status.hidden = true;
    card.appendChild(status);

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "cf-submit";
    submit.textContent = descriptor.submitLabel || "إرسال";
    card.appendChild(submit);

    card.addEventListener("submit", function (event) {
      event.preventDefault();
      if (submit.disabled) return;

      // الحقول المطلوبة بتتشاف هنا عشان المواطن ما يستناش الشبكة عشان
      // يتقاله "الحقل ده فاضي". الباقي بيتراجع على السيرفر بردو
      const missing = {};
      (descriptor.fields || []).forEach(function (field) {
        if (field.required && !String(values[field.name] || "").trim()) {
          missing[field.name] = "مطلوب";
        }
      });

      if (Object.keys(missing).length) {
        showErrors(missing);
        status.textContent = "راجع الحقول المعلّمة.";
        status.hidden = false;
        return;
      }

      showErrors({});
      status.hidden = true;
      submit.disabled = true;
      submit.textContent = "جارٍ الحفظ…";

      fetch(API_BASE + "/api/forms/" + descriptor.kind, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          values: values,
          district_id: currentDistrictId(),
        }),
      })
        .then(function (response) {
          return response.json().then(function (data) {
            return { ok: response.ok, data: data };
          });
        })
        .then(function (result) {
          if (!result.ok) {
            if (result.data && result.data.fields) showErrors(result.data.fields);
            status.textContent =
              (result.data && result.data.message) || "تعذّر الحفظ. حاول تاني.";
            status.hidden = false;
            submit.disabled = false;
            submit.textContent = descriptor.submitLabel || "إرسال";
            return;
          }

          const done = document.createElement("p");
          done.className = "cf-done";
          done.textContent = (descriptor.title || "الطلب") + " — تم الإرسال ✅";
          card.replaceWith(done);

          const extra = {
            reference: result.data.reference,
            ticket_url: result.data.ticket_url,
          };
          addMessage("bot", result.data.reply, extra);
          saveHistory("bot", result.data.reply, extra);
        })
        .catch(function () {
          status.textContent = "تعذر الاتصال بالخدمة. حاول تاني.";
          status.hidden = false;
          submit.disabled = false;
          submit.textContent = descriptor.submitLabel || "إرسال";
        });
    });

    body.appendChild(card);
    scrollToBottom();
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

        // فورم حجز أو بلاغ اتفتح تحت الرد. مفيش أكتر من واحد شغال في
        // نفس الوقت — القديم بيتشال عشان المواطن يعرف يملا أنهي واحد
        if (result.data.form) {
          removeOpenForms();
          addFormCard(result.data.form);
        }
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
