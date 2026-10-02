import type { BreadcInit } from '../types.ts';

export const en: Record<string, string> = {
  OPTIONS: 'OPTIONS',
  COMMAND: 'COMMAND',
  'Usage:': 'Usage:',
  'Commands:': 'Commands:',
  'Options:': 'Options:',
  'Print help': 'Print help',
  'Print version': 'Print version'
};

export const zh: Record<string, string> = {
  OPTIONS: '选项',
  COMMAND: '子命令',
  'Usage:': '用法:',
  'Commands:': '命令:',
  'Options:': '选项:',
  'Print help': '显示帮助信息',
  'Print version': '显示版本信息'
} as const;

export const i18n = (locale: BreadcInit['i18n'], key: string, fallback?: string) => {
  if (locale === 'zh') {
    return zh[key] || fallback || key;
  }
  return en[key] || fallback || key;
};
