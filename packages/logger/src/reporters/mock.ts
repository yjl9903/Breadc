import type { LogObject, Reporter } from '../types';

import type { FormatReporter } from './types';

interface HistoryLog {
  readonly output: string;

  readonly object: LogObject;
}

export const MockReporter = (
  reporter: FormatReporter,
  history: HistoryLog[] = []
): Reporter & { history: HistoryLog[] } => {
  return {
    history,
    print(object, ctx) {
      history.push({ output: reporter.formatLogObject(object, ctx), object });
    }
  };
};
