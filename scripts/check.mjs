import assert from 'node:assert/strict';
import path from 'node:path';
import { access, readdir } from 'node:fs/promises';
import { build } from './build.mjs';
import { languages } from './localization.mjs';

const { pages, profile, output } = await build();
assert.equal(pages.length, 3 * languages.length, 'Every page needs English and Bangla versions.');
assert.equal(pages.find(page => page.file === 'index.html')?.language, 'en', 'English must remain the default entry page.');
const pagesByFile = new Map(pages.map(page => [page.file, page]));
const idsByPage = new Map(pages.map(page => [page.file, [...page.html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1])]));
for (const { id, file, language, html } of pages) {
  assert(html.includes(`<html lang="${language}">`), `${file}: document language must match its content.`);
  const languageSwitch = html.match(/<nav class="language-switch"[^>]*>([\s\S]*?)<\/nav>/)?.[0];
  assert(languageSwitch, `${file}: missing language switch.`);
  const languageLinks = [...languageSwitch.matchAll(/<a href="\.\/([^"]+)" lang="([^"]+)" hreflang="([^"]+)"([^>]*)>/g)];
  assert.equal(languageLinks.length, languages.length, `${file}: both language options must be present.`);
  for (const [, target, lang, hrefLang, attributes] of languageLinks) {
    assert.equal(hrefLang, lang, `${file}: incorrect alternate language.`);
    assert.equal(pagesByFile.get(target)?.id, id, `${file}: language switch must keep the current page.`);
    assert.equal(pagesByFile.get(target)?.language, lang, `${file}: incorrect language destination.`);
    assert.equal(attributes.includes('aria-current="true"'), lang === language, `${file}: incorrect selected language.`);
  }
  const sameLanguageContent = html.replace(languageSwitch, '');
  for (const [, target] of sameLanguageContent.matchAll(/href="\.\/([^"#]+\.html)(?:#[^"]*)?"/g)) {
    assert.equal(pagesByFile.get(target)?.language, language, `${file}: navigation unexpectedly changes language.`);
  }
  for (const phone of profile.contact.phones) assert(html.includes(`tel:${phone.href}`), `${file}: localized display must preserve the dialable number.`);
  const ids = idsByPage.get(file);
  assert.equal(new Set(ids).size, ids.length, `${file}: IDs must be unique.`);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${file}: one primary heading is required.`);
  assert(!/\{\{[A-Z_]+\}\}/.test(html), `${file}: unresolved template field.`);
  assert(!html.includes('href="#"'), `${file}: dead placeholder link.`);
  assert(!/(?:src|href)="\/(?!\/)/.test(html), `${file}: URLs must work under a repository subpath.`);
  assert(html.includes(`mailto:${profile.contact.email}`), `${file}: missing contact email.`);
  const current = [...html.matchAll(/<a href="([^"]+)" aria-current="page"/g)];
  assert.equal(current.length, 1, `${file}: exactly one current navigation item.`);
  assert.equal(current[0][1], `./${file}`, `${file}: incorrect current page.`);
  for (const [, target] of html.matchAll(/(?:src|href)="([^"\s]+)"/g)) {
    if (target.startsWith('#')) {
      assert(ids.includes(target.slice(1)), `${file}: missing anchor ${target}`);
    } else if (target.startsWith('./')) {
      const [relative, fragment] = target.split('#');
      await access(path.join(output, relative));
      if (fragment) assert(idsByPage.get(relative.slice(2))?.includes(fragment), `${file}: missing destination anchor ${target}`);
    }
  }
  if (profile.draft) assert(html.includes('noindex, nofollow'), `${file}: draft must not be indexed.`);
}
const files = await readdir(output);
assert(!files.some(file => file === 'private' || file === 'starter_draft.md' || file === 'murad.jpeg' || /^image\d+\.jpg$/.test(file)), 'Original source materials must not be deployed.');
if (profile.draft) await assert.rejects(build({ publish: true }), /profile is a draft/);
console.log(`Passed: ${pages.length} pages, cross-page links, section anchors, assets, English/Bangla switching, language-preserving navigation, contact links and draft publication guard.`);
