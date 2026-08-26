/* ===========================================================================
   embed.js — فقاعة الشات القابلة للتضمين

   الاستخدام في أي موقع:
     <script src="{{ base_url }}/embed.js" data-district="3" defer></script>

   الخصائص الاختيارية:
     data-district  رقم الحي، عشان البوت يعرف المواطن جاي من موقع أنهي حي
     data-position  "left" أو "right"  (الافتراضي: left)
     data-color     لون الفقاعة        (الافتراضي: #0d6e54)
     data-label     نص التلميح         (الافتراضي: تحتاج مساعدة؟)
   =========================================================================== */

(function () {
  "use strict";

  // base_url متولّد من الـ Host header، فبيتحقن كـ JSON مش كنص خام
  // عشان علامة تنصيص في هيدر خبيث ما تقدرش تخرج من الـ string
  var BASE_URL = {{ base_url }};

  // نحدد وسم الـ script الحالي عشان نقرأ خصائصه
  var script = document.currentScript;

  if (!script) {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf("/embed.js") !== -1) {
        script = scripts[i];
        break;
      }
    }
  }

  var config = {
    district: (script && script.getAttribute("data-district")) || "",
    position: (script && script.getAttribute("data-position")) || "left",
    color:    (script && script.getAttribute("data-color")) || "#0d6e54",
    label:    (script && script.getAttribute("data-label")) || "تحتاج مساعدة؟",
  };

  var WIDGET_ID = "alx-district-chat-widget";

  // منع التركيب مرتين لو السكريبت اتحط أكتر من مرة
  if (document.getElementById(WIDGET_ID)) return;

  var side = config.position === "right" ? "right" : "left";

  /* ── الحاوية ──────────────────────────────────────────────────────────── */

  var container = document.createElement("div");
  container.id = WIDGET_ID;
  container.setAttribute("dir", "rtl");

  var style = document.createElement("style");
  style.textContent = [
    "#" + WIDGET_ID + "{position:fixed;bottom:20px;" + side + ":20px;z-index:2147483000;",
    "  font-family:'Cairo','Segoe UI',Tahoma,sans-serif;}",

    "#" + WIDGET_ID + " .alx-bubble{width:60px;height:60px;border-radius:50%;",
    "  background:" + config.color + ";color:#fff;border:0;cursor:pointer;font-size:26px;",
    "  box-shadow:0 6px 22px rgba(0,0,0,.24);display:grid;place-items:center;",
    "  transition:transform .18s ease, box-shadow .18s ease;}",
    "#" + WIDGET_ID + " .alx-bubble:hover{transform:scale(1.07);box-shadow:0 8px 28px rgba(0,0,0,.3);}",
    "#" + WIDGET_ID + " .alx-bubble:active{transform:scale(.96);}",

    "#" + WIDGET_ID + " .alx-tip{position:absolute;bottom:14px;" + side + ":74px;",
    "  background:#fff;color:#0f172a;padding:9px 14px;border-radius:12px;font-size:13.5px;",
    "  font-weight:600;white-space:nowrap;box-shadow:0 4px 18px rgba(0,0,0,.16);",
    "  opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s;",
    "  pointer-events:none;}",
    "#" + WIDGET_ID + " .alx-tip.show{opacity:1;transform:translateY(0);}",

    "#" + WIDGET_ID + " .alx-frame{position:fixed;bottom:92px;" + side + ":20px;",
    "  width:390px;height:min(620px, calc(100vh - 120px));border:0;border-radius:18px;",
    "  box-shadow:0 12px 44px rgba(0,0,0,.26);background:#fff;display:none;",
    "  overflow:hidden;}",
    "#" + WIDGET_ID + ".alx-open .alx-frame{display:block;}",

    "@media (max-width:480px){",
    "  #" + WIDGET_ID + " .alx-frame{width:100vw;height:100dvh;bottom:0;" + side + ":0;",
    "    border-radius:0;}",
    "  #" + WIDGET_ID + ".alx-open .alx-bubble{display:none;}",
    "}",
  ].join("");

  /* ── العناصر ──────────────────────────────────────────────────────────── */

  var tip = document.createElement("div");
  tip.className = "alx-tip";
  tip.textContent = config.label;

  var bubble = document.createElement("button");
  bubble.className = "alx-bubble";
  bubble.type = "button";
  bubble.setAttribute("aria-label", "افتح مساعد خدمة المواطن");
  bubble.textContent = "💬";

  var frame = document.createElement("iframe");
  frame.className = "alx-frame";
  frame.title = "مساعد خدمة المواطن";
  frame.setAttribute("loading", "lazy");

  var frameUrl = BASE_URL + "/widget";
  if (config.district) frameUrl += "?district=" + encodeURIComponent(config.district);

  var loaded = false;
  var open = false;

  function setOpen(value) {
    open = value;

    if (open && !loaded) {
      frame.src = frameUrl;   // نحمّل الشات أول مرة يفتح بس
      loaded = true;
    }

    container.classList.toggle("alx-open", open);
    bubble.textContent = open ? "✕" : "💬";
    bubble.setAttribute("aria-label", open ? "إغلاق المساعد" : "افتح مساعد خدمة المواطن");
    tip.classList.remove("show");
  }

  bubble.addEventListener("click", function () {
    setOpen(!open);
  });

  // زر الإغلاق اللي جوه الـ iframe
  window.addEventListener("message", function (event) {
    if (event.data && event.data.type === "alx-chat-close") setOpen(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && open) setOpen(false);
  });

  container.appendChild(style);
  container.appendChild(tip);
  container.appendChild(bubble);
  container.appendChild(frame);

  function mount() {
    document.body.appendChild(container);

    // التلميح بيظهر مرة واحدة بس لكل زائر
    var TIP_KEY = "alx_chat_tip_seen";
    var seen = false;
    try { seen = localStorage.getItem(TIP_KEY) === "1"; } catch (e) {}

    if (!seen) {
      setTimeout(function () {
        if (!open) tip.classList.add("show");
      }, 2500);

      setTimeout(function () {
        tip.classList.remove("show");
        try { localStorage.setItem(TIP_KEY, "1"); } catch (e) {}
      }, 9000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
