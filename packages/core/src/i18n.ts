let instance: (text: string, ...args: any[]) => string | undefined;

export type I18nFn = typeof instance;

export function setI18nInstance(fn: 'en' | 'zh' | I18nFn) {
  if (fn === 'en') return;
  if (fn === 'zh') {
    instance = chineseI18n;
  } else {
    instance = fn;
  }
}

const chineseI18n: I18nFn = (text) => {
  return text;
};

export function getI18n(text: string): string {
  return instance ? (instance(text) ?? text) : text;
}
