let instance:
  | ((text: string, ...args: any[]) => string | undefined)
  | undefined;

export type I18nFn = typeof instance;

export function getI18n(text: string): string {
  return instance ? (instance(text) ?? text) : text;
}

export function setI18nInstance(fn: undefined | null | 'en' | 'zh' | I18nFn) {
  if (!fn || fn === 'en') {
    instance = undefined;
  } else if (fn === 'zh') {
    instance = chineseI18n;
  } else {
    instance = fn;
  }
}

const ch: Record<string, string> = {
  'Usage:': '用法:',
  '[COMMAND]': '[命令]',
  '<COMMAND>': '<命令>',
  '[OPTIONS]': '[选项]',
  'Commands:': '命令:',
  'Options:': '选项:',
  'Print help': '输出帮助',
  'Print version': '输出版本号'
};

const chineseI18n: I18nFn = (text) => {
  return ch[text] ?? text;
};
