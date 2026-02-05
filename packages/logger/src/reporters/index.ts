import { hasTTY, isTest, isCI } from 'std-env';

import { FancyReporter } from './fancy';
import { BasicReporter } from './basic';
import { FormatReporterOptions } from './types';

export * from './mock';
export * from './basic';
export * from './fancy';

export const FormatReporter = (options: Partial<FormatReporterOptions> & { fancy?: boolean }) => {
  const isFancy = options.fancy === true || (options.fancy === undefined && hasTTY);
  return isFancy && !(isCI || isTest) ? FancyReporter() : BasicReporter();
};
