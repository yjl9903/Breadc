import { describe, expect, it } from 'vitest';

import { Logger, LogLevels, BasicReporter, MockReporter } from '../src';

describe('Basic Logger', () => {
  it('should work', () => {
    const reporter = MockReporter(BasicReporter());
    const logger = Logger({ level: LogLevels.verbose, reporter: [reporter] });

    logger.log('Hello');
    logger.log('World');
    expect(reporter.history.map((obj) => obj.output)).toMatchInlineSnapshot(`
      [
        "Hello",
        "World",
      ]
    `);
  });

  it('should format', () => {
    const reporter = MockReporter(BasicReporter());
    const logger = Logger({ level: LogLevels.verbose, reporter: [reporter] });

    logger.log('Hello %s', 'world');
    expect(reporter.history.map((obj) => obj.output)).toMatchInlineSnapshot(`
      [
        "Hello world",
      ]
    `);
  });
});
