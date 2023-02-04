import type { Breadc, Command, Plugin } from './types';

export function makePluginContainer(plugins: Partial<Plugin>[] = []) {
  type Container = Record<string, Array<() => void | Promise<void>>>;
  const onPreCommand: Container = {};
  const onPostCommand: Container = {};

  for (const plugin of plugins) {
    for (const [key, fn] of Object.entries(plugin.onPreCommand ?? {})) {
      if (key in onPreCommand) {
        onPreCommand[key] = [];
      }
      onPreCommand[key]!.push(fn);
    }
    for (const [key, fn] of Object.entries(plugin.onPostCommand ?? {})) {
      if (key in onPostCommand) {
        onPostCommand[key] = [];
      }
      onPostCommand[key]!.push(fn);
    }
  }

  const run = async (container: Container, command: Command) => {
    const prefix = command._arguments
      .filter((a) => a.type === 'const')
      .map((a) => a.name);
    for (let i = 0; i <= prefix.length; i++) {
      const key =
        i === 0
          ? '*'
          : prefix
              .slice(0, i)
              .map((t, idx) =>
                idx === 0 ? t : t[0].toUpperCase() + t.slice(1)
              )
              .join('');
      const fns = container[key];
      if (fns && fns.length > 0) {
        await Promise.all(fns.map((fn) => fn()));
      }
    }
  };

  return {
    async preRun(breadc: Breadc) {
      for (const p of plugins) {
        await p.onPreRun?.(breadc);
      }
    },
    async preCommand(command: Command) {
      await run(onPreCommand, command);
    },
    async postCommand(command: Command) {
      await run(onPostCommand, command);
    },
    async postRun(breadc: Breadc) {
      for (const p of plugins) {
        await p.onPostRun?.(breadc);
      }
    }
  };
}

export type PluginContainer = ReturnType<typeof makePluginContainer>;

export function definePlugin(plugin: Partial<Plugin>): Partial<Plugin> {
  return plugin;
}
