# @breadc/tui

[![version](https://img.shields.io/npm/v/@breadc/tui?label=@breadc/tui)](https://www.npmjs.com/package/@breadc/tui) [![CI](https://github.com/yjl9903/Breadc/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/Breadc/actions/workflows/ci.yml)

Logs, spinners, progress bars, and custom terminal views.

## Installation

```bash
npm i @breadc/tui
```

## Usage

Create a chat to print logs above live widgets. Widget updates render automatically.

```ts
import { setTimeout } from 'node:timers/promises';
import { chat } from '@breadc/tui';

const ui = chat();
const progress = ui.progress('Building', { total: 10 });

try {
  for (let value = 1; value <= 10; value++) {
    await setTimeout(100);
    progress.setState({ value });
  }
  ui.info('Build complete');
} finally {
  ui.dispose();
}
```

| Method | Description |
| --- | --- |
| `log()`, `info()`, `warn()`, `error()` | Print a formatted message. |
| `spinner(message, options?)` | Create an animated spinner. |
| `progress(message, options?)` | Create a progress bar with `value`, `total`, and `width` options. |
| `widget(spec, options?)` | Create a widget from state, a template, and optional computed fields. |
| `dispose()` | Stop updates, clear live widgets, and restore the cursor. |

Widget handles provide `setState()`, `setTemplate()`, `setFields()`, and `remove()`. Set `fixedBottom: true` to keep a widget below the others; a new fixed-bottom widget replaces the previous one.

Templates accept strings, arrays of lines, or functions receiving `{ state, tick }`. Use `{name}` to insert state or computed fields:

```ts
import { chat } from '@breadc/tui';

const ui = chat();
const status = ui.widget({
  state: { completed: 0, total: 10 },
  template: '{completed}/{total} completed ({remaining} remaining)',
  fields: { remaining: ({ state }) => state.total - state.completed }
});

status.setState({ completed: 3 });
status.remove();
ui.dispose();
```

`chat({ stream, tickInterval, nonTTYInterval })` defaults to `process.stdout`, an 80 ms animation interval, and a 1,000 ms interval for widget snapshots in redirected output. Use `log.format` to customize log messages.

## Custom rendering

Use `createRenderer()` to draw a view directly. Each `render()` call replaces the live view; `commit()` prints persistent output above it.

```ts
import { createRenderer } from '@breadc/tui';

const view = createRenderer({ viewportHeight: 2 });

view.render((frame) => {
  frame.write({ text: 'Building', style: { foreground: 'cyan', bold: true } });
  frame.write('Waiting for tasks...', { y: 1 });
});

view.commit('Build complete');
view.dispose();
```

`frame.write()` accepts plain text or styled spans and supports positioning, wrapping, and clipping. Use `batch()` to group output updates, `resize()` followed by `render()` when terminal dimensions change, and `setViewportHeight()` to change the view height. Redirected output includes committed text only.

## License

MIT License © 2023-present [XLor](https://github.com/yjl9903)
