import { EventEmitter } from 'node:events';

export type DeathSignals = 'SIGINT' | 'SIGTERM' | 'SIGQUIT';

export interface OnDeathContext {
  // Terminate process by which method or does nothing when callbacks are done
  terminate: 'exit' | 'kill' | false;

  // Call process.exit when callbacks are done
  exit: number | undefined;

  // Call process.kill when callbacks are done
  kill: NodeJS.Signals | undefined;
}

export type OnDeathCallback = (
  signal: DeathSignals,
  context: OnDeathContext
) => unknown | Promise<unknown>;

export interface OnDeathOptions {
  SIGINT?: boolean;
  SIGTERM?: boolean;
  SIGQUIT?: boolean;
}

const emitter = new EventEmitter();

const handlers: Record<DeathSignals, Handler> = {
  SIGINT: makeHandler('SIGINT'),
  SIGTERM: makeHandler('SIGTERM'),
  SIGQUIT: makeHandler('SIGQUIT')
};

export function onDeath(
  callback: OnDeathCallback,
  { SIGINT = true, SIGTERM = true, SIGQUIT = true }: OnDeathOptions = {}
): () => void {
  const cleanUps: Array<() => void> = [];

  if (SIGINT) {
    registerCallback('SIGINT', handlers.SIGINT);
    emitter.addListener('SIGINT', callback);
    cleanUps.push(() => emitter.removeListener('SIGINT', callback));
  }
  if (SIGTERM) {
    registerCallback('SIGTERM', handlers.SIGTERM);
    emitter.addListener('SIGTERM', callback);
    cleanUps.push(() => emitter.removeListener('SIGTERM', callback));
  }
  if (SIGQUIT) {
    registerCallback('SIGQUIT', handlers.SIGQUIT);
    emitter.addListener('SIGQUIT', callback);
    cleanUps.push(() => emitter.removeListener('SIGQUIT', callback));
  }

  return () => {
    for (const cleanUp of cleanUps) {
      cleanUp();
    }
  };
}

function registerCallback(signal: DeathSignals, handler: Handler) {
  if (handler.count === 0) {
    handler.count += 1;
    process.on(signal, handler.handle);
  }
}

function makeHandler(signal: DeathSignals): Handler {
  return {
    count: 0,
    async handle(signal: NodeJS.Signals) {
      const listeners = emitter.listeners(signal);
      const context: OnDeathContext = {
        terminate: 'kill',
        exit: undefined,
        kill: signal
      };

      // Iterate all the listener by reverse
      for (const listener of listeners.reverse()) {
        await listener(signal, context);
      }

      if (context.terminate === 'kill' || context.terminate === 'exit') {
        process.removeListener('SIGINT', handlers.SIGINT.handle);
        process.removeListener('SIGTERM', handlers.SIGTERM.handle);
        process.removeListener('SIGQUIT', handlers.SIGQUIT.handle);
        if (context.terminate === 'kill') {
          process.kill(process.pid, context.kill);
        } else {
          process.exit(context.exit);
        }
      }
    }
  };
}

interface Handler {
  handle: NodeJS.SignalsListener;

  count: number;
}
