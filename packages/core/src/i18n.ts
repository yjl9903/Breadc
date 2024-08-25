let instance: (text: string, ...args: any[]) => string;

export function setI18nInstance(fn: typeof instance) {
  instance = fn;
}

export function getI18n(text: string): string {
  return instance ? instance(text) : text;
}
