import type { ParseResult } from './parser/index.ts';
import type { Breadc, Command, Option, Plugin } from './types/index.ts';

export function makePluginContainer(plugins: Partial<Plugin>[] = []) {
  type Container = Record<string, Array<(result: ParseResult) => void | Promise<void>>>;
  const onPreCommand: Container = {};
  const onPostCommand: Container = {};

  for (const plugin of plugins) {
    if (typeof plugin.onPreCommand === 'function') {
      const key = '*';
      if (!(key in onPreCommand)) {
        onPreCommand[key] = [];
      }
      onPreCommand[key]!.push(plugin.onPreCommand);
    } else {
      for (const [key, fn] of Object.entries(plugin.onPreCommand ?? {})) {
        if (!(key in onPreCommand)) {
          onPreCommand[key] = [];
        }
        onPreCommand[key]!.push(fn);
      }
    }

    if (typeof plugin.onPostCommand === 'function') {
      const key = '*';
      if (!(key in onPostCommand)) {
        onPostCommand[key] = [];
      }
      onPostCommand[key]!.push(plugin.onPostCommand);
    } else {
      for (const [key, fn] of Object.entries(plugin.onPostCommand ?? {})) {
        if (!(key in onPostCommand)) {
          onPostCommand[key] = [];
        }
        onPostCommand[key]!.push(fn);
      }
    }
  }

  const run = async (container: Container, command: Command, result: ParseResult) => {
    const prefix = command._arguments.filter((a) => a.type === 'const').map((a) => a.name);
    if (prefix.length === 0) {
      prefix.push('_');
    }
    for (let i = 0; i <= prefix.length; i++) {
      const key =
        i === 0
          ? '*'
          : prefix
              .slice(0, i)
              .map((t, idx) => (idx === 0 ? t : t[0].toUpperCase() + t.slice(1)))
              .join('');
      const fns = container[key];
      if (fns && fns.length > 0) {
        await Promise.all(fns.map((fn) => fn(result)));
      }
    }
  };

  return {
    init(breadc: Breadc, allCommands: Command[], globalOptions: Option[]) {
      if (plugins.length === 0) return;
      for (const p of plugins) {
        p.onInit?.(breadc, allCommands, globalOptions);
      }
    },
    async preRun(breadc: Breadc) {
      if (plugins.length === 0) return;
      for (const p of plugins) {
        await p.onPreRun?.(breadc);
      }
    },
    async preCommand(command: Command, result: ParseResult) {
      if (plugins.length === 0) return;
      await run(onPreCommand, command, result);
    },
    async postCommand(command: Command, result: ParseResult) {
      if (plugins.length === 0) return;
      await run(onPostCommand, command, result);
    },
    async postRun(breadc: Breadc) {
      if (plugins.length === 0) return;
      for (const p of plugins) {
        await p.onPostRun?.(breadc);
      }
    }
  };
}

export type PluginContainer = ReturnType<typeof makePluginContainer>;

/* c8 ignore next 3 */
export function definePlugin(plugin: Partial<Plugin>): Partial<Plugin> {
  return plugin;
}
