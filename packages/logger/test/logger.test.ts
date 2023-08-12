import { describe, expect, it } from 'vitest';

import { Logger, MockReporter } from '../src';

describe('Basic Logger', () => {
  it('should work', () => {
    const reporter = MockReporter();
    const logger = Logger({ reporter: [reporter] });

    logger.log('Hello');
    logger.log('World');
    expect(reporter.history.map((obj) => ({ ...obj, date: undefined })))
      .toMatchInlineSnapshot(`
        [
          {
            "args": [],
            "date": undefined,
            "level": 0,
            "message": "Hello",
            "type": "info",
          },
          {
            "args": [],
            "date": undefined,
            "level": 0,
            "message": "World",
            "type": "info",
          },
        ]
      `);
  });
});
