import { EventEmitter } from 'node:events';

export type DeathSignals = 'SIGINT' | 'SIGTERM' | 'SIGQUIT';

export interface OnDeathContext {
  // Whether the event is being triggered, make sure that there is only one listener is running
  triggered: boolean;

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

const context: OnDeathContext = {
  triggered: false,
  terminate: 'kill',
  exit: undefined,
  kill: undefined
};

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
    cleanUps.push(handlers.SIGINT.addCallback(callback));
  }
  if (SIGTERM) {
    registerCallback('SIGTERM', handlers.SIGTERM);
    cleanUps.push(handlers.SIGTERM.addCallback(callback));
  }
  if (SIGQUIT) {
    registerCallback('SIGQUIT', handlers.SIGQUIT);
    cleanUps.push(handlers.SIGQUIT.addCallback(callback));
  }

  return () => {
    for (const cleanUp of cleanUps) {
      cleanUp();
    }
  };
}

export function useDeath(
  callback: OnDeathCallback,
  options: OnDeathOptions = {}
) {
  const cancel = onDeath(callback, options);

  return {
    [Symbol.dispose]: () => {
      cancel();
    }
  };
}

function registerCallback(signal: DeathSignals, handler: Handler) {
  if (handler.count === 0) {
    handler.count += 1;
    process.addListener(signal, handler.listener);
  }
}

function makeHandler(signal: DeathSignals): Handler {
  const callbacks = new WeakMap<OnDeathCallback, number>();

  return {
    count: 0,
    callbacks,
    addCallback(callback: OnDeathCallback) {
      {
        const count = callbacks.get(callback);
        if (count !== undefined) {
          callbacks.set(callback, count + 1);
        } else {
          callbacks.set(callback, 1);
          emitter.addListener(signal, callback);
        }
      }

      return () => {
        const count = callbacks.get(callback);
        if (count === undefined || count <= 1) {
          callbacks.delete(callback);
          emitter.removeListener(signal, callback);
        } else {
          callbacks.set(callback, count - 1);
        }
      };
    },
    async listener(signal: NodeJS.Signals) {
      if (context.triggered) {
        return;
      }

      context.triggered = true;
      context.kill = signal;

      const listeners = [...emitter.listeners(signal)];

      // Iterate all the listener by reverse
      for (const listener of listeners.reverse()) {
        await listener(signal, context);
      }

      if (context.terminate === 'kill' || context.terminate === 'exit') {
        process.removeListener('SIGINT', handlers.SIGINT.listener);
        process.removeListener('SIGTERM', handlers.SIGTERM.listener);
        process.removeListener('SIGQUIT', handlers.SIGQUIT.listener);

        if (context.terminate === 'kill') {
          process.kill(process.pid, context.kill);
        } else {
          process.exit(context.exit);
        }
      }

      context.triggered = false;
      context.kill = undefined;
    }
  };
}

interface Handler {
  // Listener reference counting
  count: number;

  // process.on(SIGNAL) listener
  listener: NodeJS.SignalsListener;

  // Callbacks reference counting
  callbacks: WeakMap<OnDeathCallback, number>;

  // Add callback, and return cleanUp function
  addCallback: (callback: OnDeathCallback) => () => void;
}
