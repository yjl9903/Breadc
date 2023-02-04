import { Breadc, Command } from './types';

export interface Plugin {
  onPreRun(breadc: Breadc): void | Promise<void>;
  onPreCommand(breadc: Breadc): void | Promise<void>;
  onPostCommand(breadc: Breadc): void | Promise<void>;
  onPostRun(breadc: Breadc): void | Promise<void>;
}

export function makePluginContainer(plugin: Plugin[] = []) {
  return {
    async preRun() {},
    async preCommand(command: Command) {},
    async postCommand(command: Command) {},
    async postRun() {}
  };
}

export type PluginContainer = ReturnType<typeof makePluginContainer>;

export function definePlugin(plugin: Partial<Plugin>): Plugin {
  return {
    onPreRun() {},
    onPreCommand() {},
    onPostCommand() {},
    onPostRun() {},
    ...plugin
  };
}
