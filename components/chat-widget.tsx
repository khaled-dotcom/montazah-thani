'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ui } from '@/content/ui';
import { link, type Locale } from '@/lib/i18n';

type Source = { title: string; href: string; type: string };
type Mode = 'llm' | 'local' | 'agent';
type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  mode?: Mode;
  /** Complaint or appointment number the assistant issued on this turn. */
  reference?: string | null;
  /** Same-origin URL of the appointment card, when one was produced. */
  ticketUrl?: string | null;
};

const CONSENT_KEY = 'hw-assistant-consent';
const HISTORY_KEY = 'hw-assistant-history';
const SESSION_KEY = 'hw-assistant-session';

/**
 * What the panel offers to start with.
 *
 * The two sets are not decoration. With the citizen-service assistant behind
 * it the widget can file a report and book an appointment, so it says so; with
 * only the site's own retrieval assistant it can answer questions and nothing
 * more, and offering "book me an appointment" there would be a promise the
 * system cannot keep.
 */
const suggestions: Record<'service' | 'info', Record<Locale, string[]>> = {
  service: {
    ar: [
      'عايز أبلّغ عن كسر ماسورة في الشارع',
      'إيه الأوراق المطلوبة لترخيص محل تجاري؟',
      'عايز أحجز موعد في الحي',
      'عايز أتابع بلاغ قدّمته قبل كده',
    ],
    en: [
      'I want to report a burst pipe in the street',
      'What documents do I need for a shop licence?',
      'I would like to book an appointment at the district',
      'I want to follow up a report I filed',
    ],
  },
  info: {
    ar: [
      'إزاي أستخرج ترخيص بناء؟',
      'عايز أبلّغ عن عمود إنارة معطّل',
      'إيه مواعيد المسرح الروماني؟',
      'فيه فعاليات قادمة إيه؟',
    ],
    en: [
      'How do I get a building permit?',
      'I want to report a broken streetlight',
      'What are the Roman theatre opening hours?',
      'What events are coming up?',
    ],
  },
};

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * A fresh conversation id for the assistant service, which keys everything it
 * remembers — the caller's identity, the half-filled request, the running
 * summary — off this one value. It must match `^[A-Za-z0-9_-]{8,64}$`.
 */
function newSessionId() {
  try {
    return crypto.randomUUID().replace(/-/g, '');
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** Turn bare internal paths in the reply into real links. */
function renderText(text: string) {
  const parts = text.split(/(\/(?:ar|en)\/[^\s،,؛;)]*)/g);
  return parts.map((part, i) => {
    if (!/^\/(ar|en)\//.test(part)) return <span key={i}>{part}</span>;
    const trimmed = part.replace(/[.,،؛;:]+$/, '');
    const tail = part.slice(trimmed.length);
    return (
      <span key={i}>
        <Link href={trimmed} className="font-medium text-brand underline underline-offset-2">
          {trimmed}
        </Link>
        {tail}
      </span>
    );
  });
}

export function ChatWidget({
  locale,
  serviceMode = false,
}: {
  locale: Locale;
  /**
   * True when AGENT_URL is configured, i.e. the citizen-service assistant is
   * behind the panel and it can file reports and book appointments. Resolved
   * on the server so the browser never has to ask.
   */
  serviceMode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [consented, setConsented] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Restore consent, the conversation and its id from this browsing session.
  useEffect(() => {
    try {
      /* Same reason as the theme toggle: browser storage does not exist during
         server render, so this restore can only run on mount. The rule reports
         the first setState in an effect body, so one exemption covers the four
         below it. */
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConsented(localStorage.getItem(CONSENT_KEY) === 'yes');
      const saved = sessionStorage.getItem(HISTORY_KEY);
      if (saved) setMessages(JSON.parse(saved) as Message[]);

      const existing = sessionStorage.getItem(SESSION_KEY);
      const id = existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing) ? existing : newSessionId();
      sessionStorage.setItem(SESSION_KEY, id);
      setSessionId(id);
    } catch {
      /* storage can be unavailable (private mode, blocked cookies) — the panel
         still works, it just forgets between page loads */
      setSessionId(newSessionId());
    }
  }, []);

  useEffect(() => {
    try {
      if (messages.length > 0) sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages]);

  // Keep the newest message in view.
  useEffect(() => {
    if (open && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, open, busy]);

  // Escape closes; focus returns to the launcher.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open && consented) inputRef.current?.focus();
  }, [open, consented]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || busy) return;

      const history = [...messages, { id: newId(), role: 'user' as const, content: question }];
      setMessages(history);
      setInput('');
      setBusy(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locale,
            sessionId,
            messages: history.map(({ role, content }) => ({ role, content })),
          }),
        });

        const data = (await response.json().catch(() => null)) as {
          reply?: string;
          sources?: Source[];
          mode?: Mode;
          reference?: string | null;
          ticketUrl?: string | null;
        } | null;

        if (!response.ok) {
          /* A 429 carries the assistant's own words about waiting; anything
             else is a fault and gets the generic apology. */
          const reply =
            response.status === 429 && data?.reply ? data.reply : ui.chatError[locale];
          setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: reply }]);
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: 'assistant',
            content: data?.reply ?? ui.chatError[locale],
            sources: data?.sources,
            mode: data?.mode,
            reference: data?.reference ?? null,
            ticketUrl: data?.ticketUrl ?? null,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: 'assistant', content: ui.chatError[locale] },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, locale, messages, sessionId],
  );

  function acceptConsent() {
    setConsented(true);
    try {
      localStorage.setItem(CONSENT_KEY, 'yes');
    } catch {
      /* ignore */
    }
  }

  /* A new conversation is a new conversation on the assistant's side too:
     rotating the id clears the identity and the half-filled request it is
     holding, which is exactly what someone pressing this button means. */
  function clearConversation() {
    const id = newSessionId();
    setMessages([]);
    setSessionId(id);
    setCopied(null);
    try {
      sessionStorage.removeItem(HISTORY_KEY);
      sessionStorage.setItem(SESSION_KEY, id);
    } catch {
      /* ignore */
    }
    inputRef.current?.focus();
  }

  async function copyReference(reference: string) {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(reference);
    } catch {
      /* clipboard can be blocked; the number is on screen either way */
    }
  }

  const starters = suggestions[serviceMode ? 'service' : 'info'][locale];

  return (
    <>
      {/* Launcher */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="assistant-panel"
        className="fixed bottom-5 end-5 z-50 flex items-center gap-2 rounded-full bg-brand px-4 py-3 font-semibold whitespace-nowrap text-brand-fg shadow-lg transition-transform hover:scale-105 print:hidden"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          ) : (
            <path
              d="M21 12a8 8 0 0 1-8 8H7l-4 3v-4.5A8 8 0 0 1 11 4h2a8 8 0 0 1 8 8z"
              strokeLinejoin="round"
            />
          )}
        </svg>
        <span className="hidden sm:inline">{open ? ui.chatClose[locale] : ui.chatTitle[locale]}</span>
        <span className="sm:hidden sr-only">{open ? ui.chatClose[locale] : ui.chatOpen[locale]}</span>
      </button>

      {/* Panel */}
      {open && (
        <div
          id="assistant-panel"
          ref={panelRef}
          role="dialog"
          aria-label={ui.chatTitle[locale]}
          className="card fixed inset-x-3 bottom-24 z-50 flex max-h-[min(36rem,calc(100vh-8rem))] flex-col overflow-hidden sm:inset-x-auto sm:end-5 sm:w-[26rem] print:hidden"
        >
          <div className="flex items-start justify-between gap-3 border-b border-line bg-canvas-alt px-4 py-3">
            <div>
              <h2 className="font-[family-name:--font-display] font-bold">{ui.chatTitle[locale]}</h2>
              <p className="text-xs text-fg-muted">
                {serviceMode ? ui.chatSubtitleFull[locale] : ui.chatSubtitle[locale]}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearConversation}
                  className="rounded-md px-2 py-1 text-xs text-fg-muted hover:bg-surface-2"
                >
                  {ui.chatClear[locale]}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className="rounded-md p-1.5 hover:bg-surface-2"
              >
                <span className="sr-only">{ui.chatClose[locale]}</span>
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {!consented ? (
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-sm text-fg-muted">
                {serviceMode ? ui.chatConsentFull[locale] : ui.chatConsent[locale]}
              </p>
              <button
                type="button"
                onClick={acceptConsent}
                className="mt-4 w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-brand-fg"
              >
                {ui.chatConsentAccept[locale]}
              </button>
              <p className="mt-4 text-xs text-fg-muted">
                <Link href={link('/privacy', locale)} className="underline">
                  {ui.privacyTitle[locale]}
                </Link>
              </p>
            </div>
          ) : (
            <>
              <div
                ref={logRef}
                className="flex-1 space-y-3 overflow-y-auto p-4"
                role="log"
                aria-live="polite"
                aria-label={ui.chatTitle[locale]}
              >
                {messages.length === 0 && (
                  <>
                    <p className="rounded-xl rounded-es-sm bg-surface-2 px-3.5 py-2.5 text-sm">
                      {ui.chatGreeting[locale]}
                    </p>
                    <div className="pt-2">
                      <p className="mb-2 text-xs font-semibold text-fg-muted">
                        {serviceMode
                          ? ui.chatSuggestionsService[locale]
                          : ui.chatSuggestions[locale]}
                      </p>
                      <ul className="flex flex-wrap gap-2">
                        {starters.map((s) => (
                          <li key={s}>
                            <button
                              type="button"
                              onClick={() => send(s)}
                              className="rounded-full border border-line-strong px-3 py-1.5 text-xs hover:bg-surface-2"
                            >
                              {s}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={message.role === 'user' ? 'flex justify-end' : ''}
                  >
                    <div
                      className={
                        message.role === 'user'
                          ? 'max-w-[85%] rounded-xl rounded-ee-sm bg-brand px-3.5 py-2.5 text-sm text-brand-fg'
                          : 'max-w-[95%] rounded-xl rounded-es-sm bg-surface-2 px-3.5 py-2.5 text-sm'
                      }
                    >
                      <p className="whitespace-pre-wrap">{renderText(message.content)}</p>

                      {/* A reference number is the one thing in this panel the
                          person must not lose, so it gets its own block with a
                          copy button rather than sitting inside the sentence. */}
                      {message.role === 'assistant' && message.reference && (
                        <div className="mt-3 rounded-lg border border-gold-400 bg-sand-100 p-3 dark:border-gold-600 dark:bg-ink-700">
                          <p className="text-xs font-semibold text-gold-600 dark:text-gold-400">
                            {ui.chatReference[locale]}
                          </p>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <span className="tnum font-[family-name:--font-display] text-lg font-extrabold">
                              {message.reference}
                            </span>
                            <button
                              type="button"
                              onClick={() => void copyReference(message.reference!)}
                              className="rounded-md border border-line-strong px-2 py-1 text-xs hover:bg-surface"
                            >
                              {copied === message.reference
                                ? ui.chatCopied[locale]
                                : ui.chatCopy[locale]}
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-fg-muted">
                            {ui.chatReferenceNote[locale]}
                          </p>
                          {message.ticketUrl && (
                            <a
                              href={message.ticketUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block text-xs font-semibold text-brand underline"
                            >
                              {ui.chatTicket[locale]}
                            </a>
                          )}
                        </div>
                      )}

                      {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                        <div className="mt-2.5 border-t border-line pt-2">
                          <p className="mb-1 text-xs font-semibold text-fg-muted">
                            {ui.chatSources[locale]}
                          </p>
                          <ul className="space-y-1">
                            {message.sources.slice(0, 3).map((source) => (
                              <li key={source.href + source.title}>
                                <Link
                                  href={source.href}
                                  className="text-xs text-brand hover:underline"
                                  onClick={() => setOpen(false)}
                                >
                                  {source.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {message.role === 'assistant' && message.mode && (
                        <p className="mt-2 text-[0.65rem] text-fg-muted">
                          {message.mode === 'agent'
                            ? ui.chatServiceBadge[locale]
                            : message.mode === 'llm'
                              ? ui.chatLiveBadge[locale]
                              : ui.chatOfflineBadge[locale]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {busy && (
                  <p className="text-sm text-fg-muted" aria-live="polite">
                    {ui.chatThinking[locale]}
                  </p>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(input);
                }}
                className="border-t border-line p-3"
              >
                <div className="flex items-end gap-2">
                  <label htmlFor="assistant-input" className="sr-only">
                    {ui.chatPlaceholder[locale]}
                  </label>
                  <textarea
                    id="assistant-input"
                    ref={inputRef}
                    rows={1}
                    value={input}
                    maxLength={1000}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void send(input);
                      }
                    }}
                    placeholder={ui.chatPlaceholder[locale]}
                    className="max-h-28 min-h-[2.75rem] flex-1 resize-y rounded-lg border border-line-strong bg-canvas px-3 py-2.5 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={busy || input.trim().length === 0}
                    className="rounded-lg bg-brand px-3.5 py-2.5 text-sm font-semibold text-brand-fg disabled:opacity-40"
                  >
                    {ui.chatSend[locale]}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
