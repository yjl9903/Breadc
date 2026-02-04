import type { Writable } from 'stream';

export interface ProgressBarOption {
  align?: 'left' | 'right' | 'center';

  stream?: Writable;

  forceRedraw?: boolean;

  noTTYOutput?: boolean;

  throttleTime?: number;

  notTTYSchedule?: number;

  autopaddingChar?: string;

  //
  barsize?: number;
  barCompleteString?: string;
  barGlue?: string;
  barIncompleteString?: string;
}
