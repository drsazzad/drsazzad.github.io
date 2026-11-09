import { readFile } from 'node:fs/promises';

export const languages = ['en', 'bn'];
export const localizedFile = (file, language) => language === 'en' ? file : file.replace(/\.html$/, '.bn.html');
export const localDigits = (value, language) => language === 'bn' ? String(value).replace(/\d/g, digit => '০১২৩৪৫৬৭৮৯'[Number(digit)]) : String(value);

// Only translated text is overlaid. Shared asset paths, phone targets and factual
// identifiers stay in profile.json; unknown fields or changed record counts fail.
function overlay(source, translated, trail = 'profile') {
  if (typeof source === 'string' && typeof translated === 'string') return translated;
  if (Array.isArray(source) && Array.isArray(translated)) {
    if (source.length !== translated.length) throw new Error(`Translation record count differs: ${trail}`);
    return source.map((value, index) => overlay(value, translated[index], `${trail}[${index}]`));
  }
  if (source && translated && typeof source === 'object' && typeof translated === 'object' && !Array.isArray(source) && !Array.isArray(translated)) {
    const result = { ...source };
    for (const [key, value] of Object.entries(translated)) {
      if (!(key in source)) throw new Error(`Unknown translated field: ${trail}.${key}`);
      result[key] = overlay(source[key], value, `${trail}.${key}`);
    }
    return result;
  }
  throw new Error(`Invalid translated value: ${trail}`);
}

export async function loadLocales(profile) {
  const locales = [];
  for (const language of languages) {
    const source = JSON.parse(await readFile(new URL(`../content/locales/${language}.json`, import.meta.url), 'utf8'));
    const localized = overlay(profile, source.profile);
    if (language !== 'en') {
      const english = locales[0].ui;
      if (JSON.stringify(Object.keys(english).sort()) !== JSON.stringify(Object.keys(source.ui).sort())) throw new Error(`${language}: interface translations are incomplete.`);
    }
    for (const [key, value] of Object.entries(source.ui)) {
      if (typeof value !== 'string' || !value.trim()) throw new Error(`${language}: empty translation for ${key}`);
    }
    const ui = Object.fromEntries(Object.entries(source.ui).map(([key, value]) => [key, value.replace(/\{(name|credentials|location)\}/g, (_, field) => localized[field])]));
    locales.push({ language, profile: localized, ui });
  }
  return locales;
}
