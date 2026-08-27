/**
 * Shapes shared between the assistant client and the chat panel.
 *
 * They live apart from lib/agent.ts because that module is `server-only` — it
 * holds the assistant's URL and shared secret — while the panel that draws
 * these forms runs in the browser. Types alone are erased at build time, but
 * keeping them in a file with no server imports means a stray value import can
 * never pull the credentials into a client bundle.
 */

/**
 * One field of a form the assistant opened inside the chat.
 *
 * The shape is deliberately generic: the panel draws whatever arrives without
 * knowing anything about appointments or complaints, so a field added in the
 * assistant (agent/graph/forms.py) needs no change in the widget. Options,
 * prefilled values and per-day time slots all travel with the descriptor, so
 * filling a form in costs no further round trips.
 */
export type AgentFormOption = { value: string; label: string };

export type AgentFormField = {
  name: string;
  label: string;
  /** `fixed` is a value the citizen cannot change — their own district. */
  type: 'text' | 'tel' | 'email' | 'textarea' | 'select' | 'chips' | 'fixed';
  required: boolean;
  value?: string;
  hint?: string;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  inputMode?: string;
  autoComplete?: string;
  options?: AgentFormOption[];
  /** `select` only: offer a free-text alternative to the listed options. */
  allowOther?: boolean;
  otherLabel?: string;
  /** `chips` only: the field whose value decides which options apply. */
  optionsBy?: string;
  optionsByValue?: Record<string, AgentFormOption[]>;
};

export type AgentFormKind = 'appointment' | 'complaint';

export type AgentForm = {
  kind: AgentFormKind;
  title: string;
  intro?: string;
  submitLabel: string;
  fields: AgentFormField[];
  /** Set when the form cannot be submitted at all, with the reason. */
  unavailable?: string | null;
};
