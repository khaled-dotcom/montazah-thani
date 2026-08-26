import { ui } from '@/content/ui';
import type { Locale } from '@/lib/i18n';

/**
 * The papers to bring, as something a resident can actually carry.
 *
 * Checkboxes rather than bullets, because this list is used standing at a
 * photocopier the night before, not read once. They are plain unlabelled
 * inputs on purpose: nothing is submitted, the state is the paper in the
 * person's hand, and the item text beside each box is the label.
 *
 * The print rules matter as much as the screen ones — a checklist that prints
 * with the site header, the nav and the assistant widget wastes the page a
 * resident is trying to take with them.
 */
export function DocumentChecklist({
  items,
  locale,
  title,
}: {
  items: string[];
  locale: Locale;
  /** The service name, so a printed sheet says what it is for. */
  title: string;
}) {
  return (
    <section aria-labelledby="documents" className="print-sheet">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="documents" className="rule-accent text-xl font-extrabold">
          {ui.documentsNeeded[locale]}
        </h2>
        {/* Progressive enhancement: without JavaScript the browser's own print
            command still produces the same sheet, so this is only a shortcut. */}
        <span className="text-xs text-fg-muted print:hidden">{ui.documentsChecklist[locale]}</span>
      </div>

      {/* Only shown on paper, where the surrounding page is gone. */}
      <p className="hidden text-sm font-semibold print:mt-2 print:block">{title}</p>

      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 rounded border-2 border-line-strong print:border-black"
            />
            <span className="text-sm">{item}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-fg-muted">{ui.documentsBring[locale]}</p>
    </section>
  );
}
