/* c8 ignore start */

import type { Letter, Prettify } from './utils.ts';

/**
 * Extract option type, boolean or string
 */
export type ExtractOptionType<T extends string> =
  T extends `-${Letter}, --${infer R} <${infer U}>`
    ? string
    : T extends `-${Letter}, --${infer R}`
      ? boolean
      : T extends `--${infer R} <${infer U}>`
        ? string
        : T extends `--${infer R}`
          ? boolean
          : string | boolean;

/**
 * Extract option raw name
 *
 * Examples:
 * + const t1: ExtractOption<'--option' | '--hello'> = 'hello'
 * + const t2: ExtractOption<'-r, --root'> = 'root'
 * + const t3: ExtractOption<'--page-index'> = 'pageIndex'
 */
export type ExtractOptionRawName<T extends string> =
  T extends `-${Letter}, --${infer R} <${infer U}>`
    ? R
    : T extends `-${Letter}, --no-${infer R}`
      ? R
      : T extends `-${Letter}, --${infer R}`
        ? R
        : T extends `--${infer R} <${infer U}>`
          ? R
          : T extends `--no-${infer R}`
            ? R
            : T extends `--${infer R}`
              ? R
              : never;

/**
 * Extrat camel case option name
 */
export type ExtractOptionName<
  T extends string,
  R extends string = ExtractOptionRawName<T>
> = R extends `${infer P1}-${infer P2}-${infer P3}`
  ? `${P1}${Capitalize<P2>}${Capitalize<P3>}`
  : R extends `${infer P1}-${infer P2}`
    ? `${P1}${Capitalize<P2>}`
    : R;

/**
 * Extract option information
 */
export type ExtractOption<T extends string, D = never> = {
  [k in ExtractOptionName<T>]: D extends never ? ExtractOptionType<T> : D;
};

export type Push<T extends any[], U, R> = [...T, U, R];

export type ActionFn<T extends any[], Option extends object = {}, R = any> = (
  ...arg: Push<T, Prettify<Option & { '--': string[] }>, {}>
) => R | Promise<R>;

/**
 * Max Dep: 5
 *
 * Generated by: npx tsx examples/genType.ts 5
 */
export type ExtractCommand<T extends string> =
  T extends `<${infer P1}> <${infer P2}> <${infer P3}> <${infer P4}> [...${infer P5}]`
    ? [string, string, string, string, string[]]
    : T extends `<${infer P1}> <${infer P2}> <${infer P3}> <${infer P4}> [${infer P5}]`
      ? [string, string, string, string, string | undefined]
      : T extends `<${infer P1}> <${infer P2}> <${infer P3}> <${infer P4}> <${infer P5}>`
        ? [string, string, string, string, string]
        : T extends `${infer P1} <${infer P2}> <${infer P3}> <${infer P4}> [...${infer P5}]`
          ? [string, string, string, string[]]
          : T extends `${infer P1} <${infer P2}> <${infer P3}> <${infer P4}> [${infer P5}]`
            ? [string, string, string, string | undefined]
            : T extends `${infer P1} <${infer P2}> <${infer P3}> <${infer P4}> <${infer P5}>`
              ? [string, string, string, string]
              : T extends `${infer P1} ${infer P2} <${infer P3}> <${infer P4}> [...${infer P5}]`
                ? [string, string, string[]]
                : T extends `${infer P1} ${infer P2} <${infer P3}> <${infer P4}> [${infer P5}]`
                  ? [string, string, string | undefined]
                  : T extends `${infer P1} ${infer P2} <${infer P3}> <${infer P4}> <${infer P5}>`
                    ? [string, string, string]
                    : T extends `${infer P1} ${infer P2} ${infer P3} <${infer P4}> [...${infer P5}]`
                      ? [string, string[]]
                      : T extends `${infer P1} ${infer P2} ${infer P3} <${infer P4}> [${infer P5}]`
                        ? [string, string | undefined]
                        : T extends `${infer P1} ${infer P2} ${infer P3} <${infer P4}> <${infer P5}>`
                          ? [string, string]
                          : T extends `<${infer P1}> <${infer P2}> <${infer P3}> [...${infer P4}]`
                            ? [string, string, string, string[]]
                            : T extends `<${infer P1}> <${infer P2}> <${infer P3}> [${infer P4}]`
                              ? [string, string, string, string | undefined]
                              : T extends `<${infer P1}> <${infer P2}> <${infer P3}> <${infer P4}>`
                                ? [string, string, string, string]
                                : T extends `${infer P1} <${infer P2}> <${infer P3}> [...${infer P4}]`
                                  ? [string, string, string[]]
                                  : T extends `${infer P1} <${infer P2}> <${infer P3}> [${infer P4}]`
                                    ? [string, string, string | undefined]
                                    : T extends `${infer P1} <${infer P2}> <${infer P3}> <${infer P4}>`
                                      ? [string, string, string]
                                      : T extends `${infer P1} ${infer P2} <${infer P3}> [...${infer P4}]`
                                        ? [string, string[]]
                                        : T extends `${infer P1} ${infer P2} <${infer P3}> [${infer P4}]`
                                          ? [string, string | undefined]
                                          : T extends `${infer P1} ${infer P2} <${infer P3}> <${infer P4}>`
                                            ? [string, string]
                                            : T extends `${infer P1} ${infer P2} ${infer P3} [...${infer P4}]`
                                              ? [string[]]
                                              : T extends `${infer P1} ${infer P2} ${infer P3} [${infer P4}]`
                                                ? [string | undefined]
                                                : T extends `${infer P1} ${infer P2} ${infer P3} <${infer P4}>`
                                                  ? [string]
                                                  : T extends `<${infer P1}> <${infer P2}> [...${infer P3}]`
                                                    ? [string, string, string[]]
                                                    : T extends `<${infer P1}> <${infer P2}> [${infer P3}]`
                                                      ? [
                                                          string,
                                                          string,
                                                          string | undefined
                                                        ]
                                                      : T extends `<${infer P1}> <${infer P2}> <${infer P3}>`
                                                        ? [
                                                            string,
                                                            string,
                                                            string
                                                          ]
                                                        : T extends `${infer P1} <${infer P2}> [...${infer P3}]`
                                                          ? [string, string[]]
                                                          : T extends `${infer P1} <${infer P2}> [${infer P3}]`
                                                            ? [
                                                                string,
                                                                (
                                                                  | string
                                                                  | undefined
                                                                )
                                                              ]
                                                            : T extends `${infer P1} <${infer P2}> <${infer P3}>`
                                                              ? [string, string]
                                                              : T extends `${infer P1} ${infer P2} [...${infer P3}]`
                                                                ? [string[]]
                                                                : T extends `${infer P1} ${infer P2} [${infer P3}]`
                                                                  ? [
                                                                      | string
                                                                      | undefined
                                                                    ]
                                                                  : T extends `${infer P1} ${infer P2} <${infer P3}>`
                                                                    ? [string]
                                                                    : T extends `${infer P1} ${infer P2} ${infer P3}`
                                                                      ? []
                                                                      : T extends `<${infer P1}> [...${infer P2}]`
                                                                        ? [
                                                                            string,
                                                                            string[]
                                                                          ]
                                                                        : T extends `<${infer P1}> [${infer P2}]`
                                                                          ? [
                                                                              string,
                                                                              (
                                                                                | string
                                                                                | undefined
                                                                              )
                                                                            ]
                                                                          : T extends `<${infer P1}> <${infer P2}>`
                                                                            ? [
                                                                                string,
                                                                                string
                                                                              ]
                                                                            : T extends `${infer P1} [...${infer P2}]`
                                                                              ? [
                                                                                  string[]
                                                                                ]
                                                                              : T extends `${infer P1} [${infer P2}]`
                                                                                ? [
                                                                                    | string
                                                                                    | undefined
                                                                                  ]
                                                                                : T extends `${infer P1} <${infer P2}>`
                                                                                  ? [
                                                                                      string
                                                                                    ]
                                                                                  : T extends `${infer P1} ${infer P2}`
                                                                                    ? []
                                                                                    : T extends `[...${infer P1}]`
                                                                                      ? [
                                                                                          string[]
                                                                                        ]
                                                                                      : T extends `[${infer P1}]`
                                                                                        ? [
                                                                                            | string
                                                                                            | undefined
                                                                                          ]
                                                                                        : T extends `<${infer P1}>`
                                                                                          ? [
                                                                                              string
                                                                                            ]
                                                                                          : T extends `${infer P1}`
                                                                                            ? []
                                                                                            : T extends ``
                                                                                              ? []
                                                                                              : never;

/* c8 ignore end */
