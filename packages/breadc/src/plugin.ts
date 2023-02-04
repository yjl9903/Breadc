import type { Command, Plugin } from './types';

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
