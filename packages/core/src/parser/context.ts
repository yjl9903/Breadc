import type { BreadcInstance, InternalCommand } from '../breadc/types/index.ts';

export type Context<Data extends Record<never, never>> = {
  data: Data;

  instance: BreadcInstance;

  command?: InternalCommand;
};
