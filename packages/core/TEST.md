# @breadc/core Test Plan

This plan references the legacy `packages/breadc/test/*.test.ts` coverage and adapts it to the new core architecture.

## packages/core/test/command.test.ts

- Spec parsing: const pieces, whitespace, default command, multi-level sub-commands
- Argument parsing: required / optional / spread syntax and ordering rules
- Alias parsing: valid aliases, invalid aliases containing arguments
- Error cases: invalid argument formats, empty argument names, ordering errors
- Custom arguments: `argument('<arg>') / argument('[arg]') / argument('[...arg]')` parse results
- Custom argument ordering conflicts: optional then required, duplicated spread, etc.

## packages/core/test/group.test.ts

- Spec parsing: arguments are not allowed, empty spec errors
- Group command pieces resolution (builder-level resolve only)

## packages/core/test/option.test.ts

- Spec parsing: short/long, required/optional/spread
- `--no-*` spec validity (spec-level only)
- Invalid spec errors

## packages/core/test/parser.test.ts

### Parse Behavior (Detailed)

- Single default command
- Single sub-command
- Multiple sub-commands
- Default command + multiple sub-commands
- Alias default command + multiple sub-commands
- Default command + multiple sub-commands + group commands
- Multiple Sub-commands with multiple aliases

### Argument Matching

- Required / optional / spread matching and remaining args
- Manual `argument()` mixed with spec args (ordering, spread consumption)
- Manual argument `cast/default/initial` effects

### Options Behavior

- `--` escape and `options['--']` must include args after `--`
- camelCase key mapping
- `--flag` long parsing
- `--flag=value` long parsing
- `--flag value` long parsing
- `-f` short options parsing
- boolean value parsing (YES/NO/etc.)
- `--no-*` negation semantics for boolean option
- `default/initial/cast` semantics
- required option value parsing
- optional option value parsing

### Option Layering

- Options configured at root app, group, and command
- Override precedence across layers
- `options['--']` coexistence with layered options

### Other Parsing Rules

- Negative numbers vs short options
- `allowUnknownOptions` is WIP, leaving `it.todo`

### Parse Errors (Placeholder)

- Missing required arguments
- Unknown sub-command
- Duplicated default command
- Other parse-time error paths
- Use `it.todo` for now

## packages/core/test/run.test.ts

- `run()` argument passing and return values
- `options['--']` forwarded to action
- Middleware order: app → group → command
- Middleware `data` override behavior
- Missing action error path

## packages/core/test/breadc.test.ts

- Builtin `--version/-v` output: unknown and provided version
- Builtin `--help/-h` output (current behavior)
- Builtin no commands matched should print help message
- Help message generation logic (WIP)
- Custom builtin spec/description (WIP)
- i18n supports (WIP)

## packages/core/test/lexer.test.ts

- Keep existing coverage
- Optional: negative number tokens and `--` escape

## packages/core/test/breadc.test-d.ts

- options camelCase type inference matches runtime keys
- option `cast/default/initial` type inference
- argument `cast/default/initial` type inference
- group/command chaining inference
- middleware `data` inference
