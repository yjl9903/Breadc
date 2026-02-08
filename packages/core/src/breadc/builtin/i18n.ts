import type { Context } from '../../runtime/context';

export const en: Record<string, string> = {
  'Usage:': 'Usage:',
  'Commands:': 'Commands:',
  'Options:': 'Options:',
  'Print help': 'Print help',
  'Print version': 'Print version'
};

export const zh: Record<string, string> = {
  'Usage:': '使用:',
  'Commands:': '命令:',
  'Options:': '选项:',
  'Print help': '显示帮助信息',
  'Print version': '显示版本信息'
} as const;

export const i18n = (context: Context<any>, key: string, fallback?: string) => {
  if (context.breadc._init.i18n === 'zh') {
    return zh[key] || fallback || key;
  }
  return en[key] || fallback || key;
};
