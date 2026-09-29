# TUI tests

Tests mirror the source modules, with shared fixtures outside either module:

```text
test/
├── chat/
│   ├── ansi.test.ts
│   ├── chat.test.ts
│   ├── helpers.test.ts
│   └── terminal.test.ts
├── render/
│   ├── buffer.test.ts
│   ├── insert.test.ts
│   ├── renderer.test.ts
│   ├── style.test.ts
│   └── terminal.test.ts
└── helpers/
    ├── death.ts
    ├── stream.ts
    └── terminal.ts
```

Within each module, tests are grouped by the behavior they own:

- `chat/ansi`, `chat/helpers`, `render/buffer`, and `render/style`: pure transformations. Use explicit expected values and no mocks. Comparing measurement with painting is useful supplementary coverage, but both share layout code and cannot be each other's sole oracle.
- `render/terminal` and `render/insert`: real `InlineRenderer` behavior, including output interpreted by xterm. Verify screen rows, history, cell attributes, and cursor coordinates after each operation, including incremental updates, insertion, and resizes.
- `chat/chat` and `chat/terminal`: public Chat behavior with the real renderer. The former covers components, scheduling, and pipe output; the latter covers terminal integration with external writes, controls, and lifecycle transitions.
- `render/renderer`: capture-only output contracts such as synchronized writes, unchanged-frame silence, pipe output, and OSC 8 sequences unavailable through xterm's public buffer API.

## Shared fixtures

`helpers/stream.ts` captures writes for protocol and non-TTY assertions. `helpers/terminal.ts` adds a real xterm interpreter to that stream. Await `flush()` after a public operation before reading terminal state or resetting captured output. For resize tests, flush the old frame, resize the terminal, notify the renderer, redraw, and flush again.

`screen` and `lines()` retain blank rows. `content()` explicitly crops outer unused rows; it preserves internal blank separators. For a bottom-anchored viewport, assert `screen.slice(-height)` and `aboveViewport(height)` separately, so unused space between history and the viewport does not obscure either region's content. Use `cell()` when attributes or trailing styled spaces matter.

`helpers/death.ts` replaces only process-signal registration. Import it before application modules. Its shared mock retains registration/cancellation semantics and can simulate an interrupt with `death.emit()`. Dispose owners before terminal streams, then call `assertDeathHandlersReleased()`; do not clear registrations before checking for leaks.

Fake timers belong to ticker and throttling cases. Fake only `Date`, `setInterval`, and `clearInterval`, leaving xterm's asynchronous parser on real timers. Component state/template updates should render automatically after `flush()`; use `render(true)` only when explicitly testing forced rendering.

Prefer complete observable results over substrings of ANSI output or spies on renderer internals. Keep transport assertions only where the transport behavior is itself the contract.
