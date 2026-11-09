import { readFile, writeFile, mkdir, cp, rm, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { languages, localizedFile, localDigits, loadLocales } from './localization.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const e = escapeHtml;

async function publicAsset(value, extensions) {
  if (!value) return '';
  if (!/^assets\/[a-zA-Z0-9_./-]+$/.test(value) || value.split('/').some((part) => part === '..' || part === '.')) throw new Error(`Use a local assets/ path: ${value}`);
  if (!extensions.includes(path.extname(value).toLowerCase())) throw new Error(`Unsupported asset type: ${value}`);
  await access(path.join(root, 'public', value));
  return `./${value}`;
}

export async function build({ publish = false } = {}) {
  const profile = JSON.parse(await readFile(path.join(root, 'content/profile.json'), 'utf8'));
  if (typeof profile.draft !== 'boolean') throw new Error('profile.draft must be true or false.');
  if (publish && profile.draft) throw new Error('This profile is a draft. Review the content checklist before setting draft to false and publishing.');
  for (const key of ['name', 'shortName', 'role', 'credentials', 'location']) {
    if (!profile[key]?.trim()) throw new Error(`Missing profile field: ${key}`);
  }
  const email = profile.contact.email;
  if (email && !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) throw new Error('Invalid contact email.');
  for (const phone of profile.contact.phones) {
    if (!/^\+[0-9]{8,15}$/.test(phone.href)) throw new Error('Phone links need an international +countrycode number.');
  }
  if (profile.contact.linkedin && !/^https:\/\/(www\.)?linkedin\.com\/in\/[\w%-]+\/?$/.test(profile.contact.linkedin)) throw new Error('Use a LinkedIn profile URL.');
  if (profile.siteUrl && !/^https:\/\/[^\s"<>]+\/$/.test(profile.siteUrl)) throw new Error('siteUrl must be an HTTPS URL ending in a slash.');
  const portrait = await publicAsset(profile.portrait.src, ['.jpg', '.jpeg', '.png', '.webp', '.avif']);
  const clinicalImage = await publicAsset(profile.clinicalImage?.src, ['.jpg', '.jpeg', '.png', '.webp', '.avif']);
  const credentialsImage = await publicAsset(profile.credentialsImage?.src, ['.jpg', '.jpeg', '.png', '.webp', '.avif']);
  const cv = await publicAsset(profile.cv.path, ['.pdf']);
  const template = await readFile(path.join(root, 'src/index.html'), 'utf8');
  const definitions = [
    { id: 'overview', file: 'index.html', label: 'Overview' },
    { id: 'experience', file: 'experience.html', label: 'Experience' },
    { id: 'credentials', file: 'credentials.html', label: 'Credentials' }
  ];
  const render = (source, values) => source.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template field: ${key}`);
    return values[key];
  });
  const pages = [];
  const locales = await loadLocales(profile);
  for (const { language, profile, ui } of locales) {
    const pending = (note) => profile.draft && profile.showEditorialNotes && note ? `<p class="pending-note">${e(note)}</p>` : '';
    const title = `${profile.name} | ${ui.OVERVIEW_TITLE}`;
    const description = ui.META_DESCRIPTION;
    const fields = {
      ...Object.fromEntries(Object.entries(ui).map(([key, value]) => [`UI_${key}`, e(value)])),
      LANGUAGE: language, ONE: localDigits('01', language), TWO: localDigits('02', language),
      OVERVIEW_URL: `./${localizedFile('index.html', language)}`,
      EXPERIENCE_URL: `./${localizedFile('experience.html', language)}`,
      CREDENTIALS_URL: `./${localizedFile('credentials.html', language)}`,
      PAGE_TITLE: e(title), DESCRIPTION: e(description), ROBOTS: profile.draft ? 'noindex, nofollow' : 'index, follow',
      NAME: e(profile.name), SHORT_NAME: e(profile.shortName), INITIALS: e(profile.initials), CREDENTIALS: e(profile.credentials), ROLE: e(profile.role), LOCATION: e(profile.location), INTRO: e(profile.intro),
      FOCUS_SUMMARY: e(profile.focusSummary), CURRENT_APPOINTMENT: e(profile.experience[0]?.title || ''),
      SPECIALTY: e(profile.specialty), EXPERIENCE_YEARS: e(profile.experienceYears), ORGANIZATION: e(profile.experience[0]?.organization || ''),
      CANONICAL: profile.siteUrl ? `<link rel="canonical" href="${e(profile.siteUrl)}"><meta property="og:url" content="${e(profile.siteUrl)}">` : '',
      DRAFT_BANNER: profile.draft ? `<span class="draft-badge">${e(ui.PREVIEW)}</span>` : '',
      DRAFT_FOOTER: profile.draft ? `<p class="draft-footer">${e(ui.DRAFT_NOTICE)}</p>` : '',
      CV_LINK: cv ? `<a class="text-link" href="${e(cv)}" download>${e(profile.cv.label)} <span aria-hidden="true">↓</span></a>` : '',
      PORTRAIT: portrait ? `<div class="portrait-frame"><img class="portrait-image" src="${e(portrait)}" alt="${e(profile.portrait.alt)}" width="${e(profile.portrait.width)}" height="${e(profile.portrait.height)}" fetchpriority="high"></div>` : `<div class="portrait-placeholder" role="img" aria-label="${e(profile.name)} ${e(ui.MONOGRAM)}"><span class="portrait-initials" aria-hidden="true">${e(profile.initials)}</span></div>`,
      CLINICAL_IMAGE: clinicalImage ? `<div class="practice-image"><img src="${e(clinicalImage)}" alt="${e(profile.clinicalImage.alt)}" width="${e(profile.clinicalImage.width)}" height="${e(profile.clinicalImage.height)}" loading="lazy"></div>` : '',
      CREDENTIALS_IMAGE: credentialsImage ? `<div class="credential-image"><img src="${e(credentialsImage)}" alt="${e(profile.credentialsImage.alt)}" width="${e(profile.credentialsImage.width)}" height="${e(profile.credentialsImage.height)}" loading="lazy"></div>` : '',
      HERO_CONTACT: [
        email ? `<a class="email-link" href="mailto:${e(email)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg><span>${e(email)}</span><span aria-hidden="true">↗</span></a>` : '',
        profile.contact.phones[0] ? `<a class="phone-link" href="tel:${e(profile.contact.phones[0].href)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m5 3 4 1 1 5-3 2a15 15 0 0 0 6 6l2-3 5 1 1 4c0 2-2 3-4 2A24 24 0 0 1 3 7C2 5 3 3 5 3Z"/></svg><span>${e(profile.contact.phones[0].display)}</span></a>` : ''
      ].join(''),
      BIOGRAPHY: profile.biography.map((paragraph) => `<p>${e(paragraph)}</p>`).join('\n'),
      FOCUS: profile.focus.map((item, index) => `<div class="focus-item"><span aria-hidden="true">${localDigits(String(index + 1).padStart(2, '0'), language)}</span><h3>${e(item.title)}</h3><p>${e(item.text)}</p></div>`).join('\n'),
      EXPERIENCE: profile.experience.map((item) => `<article class="timeline-item"><p class="timeline-period"><span class="timeline-dot" aria-hidden="true"></span>${e(item.period)}</p><div><h3>${e(item.title)}</h3><p class="timeline-org">${e(item.organization)}</p><p class="timeline-location">${e(item.location)}</p><p class="timeline-description">${e(item.description)}</p>${pending(item.note)}</div></article>`).join('\n'),
      CAREER_NOTE: profile.draft && profile.showEditorialNotes ? `<p class="career-note">${e(ui.CAREER_NOTE)}</p>` : '',
      EDUCATION: profile.education.map((item) => `<article class="qualification"><div class="qualification-award"><h3>${e(item.title)}</h3><span>${e(item.institution)}</span></div><div><p class="qualification-area">${e(item.heading)}</p><p class="qualification-description">${e(item.description)}</p>${item.year ? `<p class="qualification-year">${e(item.year)}</p>` : ''}${pending(item.note)}</div></article>`).join('\n'),
      REGISTRATION: profile.registration.number ? `<div class="registration"><svg class="registration-icon" viewBox="0 0 24 30" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><rect x="3" y="2" width="18" height="23" rx="1"/><path d="M7 8h10M7 12h7M7 16h5"/><circle cx="17" cy="22" r="4"/><path d="m14 25-1 4 4-2 4 2-1-4"/></svg><div><span class="meta-label">${e(profile.registration.label)}</span><strong>${e(profile.registration.number)}</strong>${pending(profile.registration.note)}</div></div>` : '',
      DEVELOPMENT: profile.development.map((item, index) => `<article class="development-item"><span class="development-number" aria-hidden="true">${localDigits(String(index + 1).padStart(2, '0'), language)}</span><div><p class="development-category">${e(item.category)}</p><h3>${e(item.title)}</h3><p class="development-location">${e(item.location)}</p><p class="development-description">${e(item.description)}</p>${pending(item.note)}</div></article>`).join('\n'),
      CONTACT_CTA: email ? `<a class="button" href="mailto:${e(email)}">${e(ui.CONTACT_CTA)} <span aria-hidden="true">↗</span></a>` : '',
      CONTACT_DETAILS: [
        email ? `<div class="contact-block"><span class="meta-label">${e(ui.EMAIL)}</span><a href="mailto:${e(email)}">${e(email)}</a></div>` : '',
        profile.contact.phones.length ? `<div class="contact-block"><span class="meta-label">${e(ui.TELEPHONE)}</span><div class="phone-list">${profile.contact.phones.map((phone) => `<a href="tel:${e(phone.href)}">${e(phone.display)}</a>`).join('')}</div></div>` : '',
        profile.contact.address.length ? `<div class="contact-block"><span class="meta-label">${e(ui.ADDRESS)}</span><address class="contact-address">${profile.contact.address.map(e).join('<br>')}</address></div>` : '',
        profile.contact.linkedin ? `<div class="contact-block"><a href="${e(profile.contact.linkedin)}" target="_blank" rel="noopener noreferrer">${e(ui.LINKEDIN)} <span aria-hidden="true">↗</span></a></div>` : ''
      ].join('\n')
    };
    for (const page of definitions) {
      const file = localizedFile(page.file, language);
      const pageUrl = profile.siteUrl ? new URL(page.id === 'overview' && language === 'en' ? './' : file, profile.siteUrl).href : '';
      const values = {
        ...fields,
        PAGE_ID: page.id,
        PAGE_TITLE: e(`${profile.name} | ${page.id === 'overview' ? ui.OVERVIEW_TITLE : ui[page.id.toUpperCase()]}`),
        CANONICAL: `<meta property="og:locale" content="${language === 'bn' ? 'bn_BD' : 'en_US'}">` + (pageUrl ? `<link rel="canonical" href="${e(pageUrl)}"><meta property="og:url" content="${e(pageUrl)}">${[...languages, 'x-default'].map(lang => `<link rel="alternate" hreflang="${lang}" href="${e(new URL(localizedFile(page.file, lang === 'x-default' ? 'en' : lang), profile.siteUrl).href)}">`).join('')}` : ''),
        NAVIGATION: definitions.map(item => `<a href="./${localizedFile(item.file, language)}"${item.id === page.id ? ' aria-current="page"' : ''}>${e(ui[item.id.toUpperCase()])}</a>`).join(''),
        LANGUAGE_SWITCH: `<nav class="language-switch" aria-label="${e(ui.LANGUAGE_LABEL)}">${languages.map(lang => `<a href="./${localizedFile(page.file, lang)}" lang="${lang}" hreflang="${lang}"${lang === language ? ' aria-current="true"' : ''}>${lang === 'en' ? 'English' : 'বাংলা'}</a>`).join('')}</nav>`,
        PAGE_CONTENT: render(await readFile(path.join(root, `src/pages/${page.id}.html`), 'utf8'), fields)
      };
      pages.push({ ...page, file, language, html: render(template, values) });
    }
  }
  const output = path.join(root, 'dist');
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(path.join(root, 'public'), output, { recursive: true });
  for (const page of pages) await writeFile(path.join(output, page.file), page.html);
  await writeFile(path.join(output, 'robots.txt'), profile.draft ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n');
  console.log(`Built ${pages.length} ${profile.draft ? 'draft' : 'publication'} pages → dist/`);
  return { html: pages[0].html, pages, profile, output };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build({ publish: process.argv.includes('--publish') }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
