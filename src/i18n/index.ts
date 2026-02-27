import { zhCN } from './locales/zh-cn';
import { en } from './locales/en';
import type { Translations } from './locales/zh-cn';

const locales: Record<string, Translations> = {
  'zh-cn': zhCN,
  'zh': zhCN,
  'en': en,
};

let currentLocale: Translations = en;

export function initI18n(language?: string) {
  const lang = language?.toLowerCase() || 'en';
  currentLocale = locales[lang] || locales['zh-cn'] || en;
}

export function t<K extends keyof Translations>(
  key: K
): Translations[K] {
  return currentLocale[key];
}

export function getCurrentLocale(): string {
  return Object.keys(locales).find(
    key => locales[key] === currentLocale
  ) || 'en';
}

export { type Translations };
