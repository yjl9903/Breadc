import type { LogObject, Reporter } from '../types';

export const MockReporter = (
  history: LogObject[] = []
): Reporter & { history: LogObject[] } => {
  return {
    history,
    print(obj) {
      history.push(obj);
    }
  };
};
