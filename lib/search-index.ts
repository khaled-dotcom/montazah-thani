import 'server-only';

import type { Doc } from '@/lib/search';
import { link, type Locale } from '@/lib/i18n';
import { trails, transportModes } from '@/content/transport';

import { faqs, intro, pillars, timeline } from '@/content/about';
import { listings } from '@/content/directory';
import { events } from '@/content/events';
import { allLandmarks, allNews } from '@/lib/cms';
import { services } from '@/content/services';
import { site } from '@/content/site';

/** Build the full searchable corpus for one language. */
export async function buildIndex(locale: Locale): Promise<Doc[]> {
  const docs: Doc[] = [];

  for (const l of await allLandmarks()) {
    docs.push({
      id: `landmark:${l.slug}`,
      type: 'landmark',
      title: l.name[locale],
      summary: l.summary[locale],
      text: [
        l.name[locale],
        l.section[locale],
        l.summary[locale],
        ...l.body[locale],
        ...l.highlights[locale],
        l.visit.hours[locale],
        l.visit.tickets[locale],
        l.visit.access[locale],
        l.visit.getting[locale],
      ].join(' '),
      href: link(`/landmarks/${l.slug}`, locale),
    });
  }

  for (const s of services) {
    docs.push({
      id: `service:${s.slug}`,
      type: 'service',
      title: s.title[locale],
      summary: s.summary[locale],
      text: [
        s.title[locale],
        s.summary[locale],
        ...s.eligibility[locale],
        ...s.documents[locale],
        ...s.steps[locale],
        s.fee[locale],
        s.duration[locale],
        s.channel[locale],
      ].join(' '),
      href: link(`/services/${s.slug}`, locale),
    });
  }

  for (const n of await allNews()) {
    docs.push({
      id: `news:${n.slug}`,
      type: 'news',
      title: n.title[locale],
      summary: n.summary[locale],
      text: [n.title[locale], n.summary[locale], ...n.body[locale]].join(' '),
      href: link(`/news/${n.slug}`, locale),
    });
  }

  for (const e of events) {
    docs.push({
      id: `event:${e.slug}`,
      type: 'event',
      title: e.title[locale],
      summary: e.summary[locale],
      text: [e.title[locale], e.summary[locale], e.venue[locale], e.time[locale], e.date, e.booking[locale]].join(' '),
      href: link('/events', locale),
    });
  }

  for (const l of listings) {
    docs.push({
      id: `listing:${l.id}`,
      type: 'listing',
      title: l.name[locale],
      summary: l.blurb[locale],
      text: [l.name[locale], l.blurb[locale], l.section[locale], l.street[locale]].join(' '),
      href: link('/directory', locale),
    });
  }

  for (const f of faqs) {
    docs.push({
      id: `faq:${f.q.en}`,
      type: 'faq',
      title: f.q[locale],
      summary: f.a[locale],
      text: `${f.q[locale]} ${f.a[locale]}`,
      href: link('/contact#faq', locale),
    });
  }

  // Static pages, so a search for "history" or "parking" lands somewhere useful.
  docs.push({
    id: 'page:about',
    type: 'page',
    title: locale === 'ar' ? 'عن الحي — التاريخ والهوية' : 'About the district — history and identity',
    summary: intro[locale][0],
    text: [
      ...intro[locale],
      ...timeline.map((t) => `${t.period[locale]} ${t.title[locale]} ${t.text[locale]}`),
      ...pillars.map((p) => `${p.title[locale]} ${p.text[locale]}`),
    ].join(' '),
    href: link('/about', locale),
  });

  docs.push({
    id: 'page:map',
    type: 'page',
    title: locale === 'ar' ? 'الخرائط والتنقل' : 'Maps and transport',
    summary:
      locale === 'ar'
        ? 'وسائل التنقل داخل الحي، ومسارات المشي التراثية، ومواقف السيارات.'
        : 'Getting around the district, heritage walking trails and parking.',
    text: [
      ...transportModes.map((m) => `${m.name[locale]} ${m.detail[locale]} ${m.note[locale]}`),
      ...trails.map((t) => `${t.name[locale]} ${t.summary[locale]} ${t.duration[locale]}`),
    ].join(' '),
    href: link('/map', locale),
  });

  docs.push({
    id: 'page:contact',
    type: 'page',
    title: locale === 'ar' ? 'اتصل بنا' : 'Contact us',
    summary: `${site.address[locale]} — ${site.hours[locale]}`,
    text: [
      site.address[locale],
      site.hours[locale],
      site.phone,
      site.email,
      ...site.hotlines.map((h) => `${h.label[locale]} ${h.number}`),
    ].join(' '),
    href: link('/contact', locale),
  });

  return docs;
}
