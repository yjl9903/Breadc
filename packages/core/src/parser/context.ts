import type { BreadcInstance, InternalCommand } from '../breadc/types/index.ts';

export type Context<Data extends unknown, Return extends unknown> = {
  data: Data;

  output?: Return;

  instance: BreadcInstance;

  command?: InternalCommand;
};
