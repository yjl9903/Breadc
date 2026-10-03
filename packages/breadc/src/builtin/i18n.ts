import type { BreadcInit } from '../types.ts';

const en = {
  OPTIONS: 'options',
  COMMAND: 'command',
  'Usage:': 'Usage:',
  'Commands:': 'Commands:',
  'Options:': 'Options:',
  'Show help': 'Show help',
  'Arguments:': 'Arguments:',
  'Examples:': 'Examples:',
  'Aliases:': 'Aliases:',
  'Show version': 'Show version'
};

export type TranslationKey = keyof typeof en;

const zh: Record<TranslationKey, string> = {
  OPTIONS: '选项',
  COMMAND: '子命令',
  'Usage:': '用法:',
  'Commands:': '命令:',
  'Options:': '选项:',
  'Show help': '显示帮助',
  'Arguments:': '参数:',
  'Examples:': '示例:',
  'Aliases:': '别名:',
  'Show version': '显示版本'
};

export const i18n = (locale: BreadcInit['i18n'], key: TranslationKey) => (locale === 'zh' ? zh : en)[key];
