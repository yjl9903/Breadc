import type { ActionMiddleware } from '@breadc/core';

export function complete(): ActionMiddleware {
  return (context, next) => {
    return next();
  };
}
