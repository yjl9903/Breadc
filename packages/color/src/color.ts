/**
 * Detect how much colors the current terminal supports
 */
export const enum SupportLevel {
  none,
  ansi,
  ansi256
}

/**
 * Config whether enable color output
 */
export const options = {
  enabled: true,
  supportLevel: SupportLevel.none
};

// Support both browser and node environments
const globalVar =
  // @ts-ignore
  typeof self !== 'undefined'
    ? // @ts-ignore
      self
    : // @ts-ignore
    typeof window !== 'undefined'
    ? // @ts-ignore
      window
    : typeof global !== 'undefined'
    ? global
    : ({} as any);

if (globalVar.process && globalVar.process.env && globalVar.process.stdout) {
  const { FORCE_COLOR, NODE_DISABLE_COLORS, NO_COLOR, TERM } =
    globalVar.process.env;
  if (NODE_DISABLE_COLORS || NO_COLOR || FORCE_COLOR === '0') {
    options.enabled = false;
  } else if (
    FORCE_COLOR === '1' ||
    FORCE_COLOR === '2' ||
    FORCE_COLOR === '3'
  ) {
    options.enabled = true;
  } else if (TERM === 'dumb') {
    options.enabled = false;
  } else if (
    'CI' in globalVar.process.env &&
    [
      'TRAVIS',
      'CIRCLECI',
      'APPVEYOR',
      'GITLAB_CI',
      'GITHUB_ACTIONS',
      'BUILDKITE',
      'DRONE'
    ].some((vendor) => vendor in globalVar.process.env)
  ) {
    options.enabled = true;
  } else {
    options.enabled = process.stdout.isTTY;
  }

  if (options.enabled) {
    options.supportLevel =
      TERM && TERM.endsWith('-256color')
        ? SupportLevel.ansi256
        : SupportLevel.ansi;
  }
}

function kolorist(
  start: number | string,
  end: number | string,
  level: SupportLevel = SupportLevel.ansi
) {
  const open = `\x1b[${start}m`;
  const close = `\x1b[${end}m`;
  const regex = new RegExp(`\\x1b\\[${end}m`, 'g');

  return (str: string | number) => {
    return options.enabled && options.supportLevel >= level
      ? open + ('' + str).replace(regex, open) + close
      : '' + str;
  };
}

export function combine(...fns: ReturnType<typeof kolorist>[]) {
  return (str: string | number) => {
    for (const fn of fns) {
      str = fn(str);
    }
    return str;
  };
}

export function stripColors(str: string | number) {
  return ('' + str)
    .replace(/\x1b\[[0-9;]+m/g, '')
    .replace(/\x1b\]8;;.*?\x07(.*?)\x1b\]8;;\x07/g, (_, group) => group);
}

// modifiers
export const reset = kolorist(0, 0);
export const bold = kolorist(1, 22);
export const dim = kolorist(2, 22);
export const italic = kolorist(3, 23);
export const underline = kolorist(4, 24);
export const inverse = kolorist(7, 27);
export const hidden = kolorist(8, 28);
export const strikethrough = kolorist(9, 29);

// colors
export const black = kolorist(30, 39);
export const red = kolorist(31, 39);
export const green = kolorist(32, 39);
export const yellow = kolorist(33, 39);
export const blue = kolorist(34, 39);
export const magenta = kolorist(35, 39);
export const cyan = kolorist(36, 39);
export const white = kolorist(97, 39);
export const gray = kolorist(90, 39);

export const lightRed = kolorist(91, 39);
export const lightGreen = kolorist(92, 39);
export const lightYellow = kolorist(93, 39);
export const lightBlue = kolorist(94, 39);
export const lightMagenta = kolorist(95, 39);
export const lightCyan = kolorist(96, 39);
export const lightGray = kolorist(37, 39);

// background colors
export const bgBlack = kolorist(40, 49);
export const bgRed = kolorist(41, 49);
export const bgGreen = kolorist(42, 49);
export const bgYellow = kolorist(43, 49);
export const bgBlue = kolorist(44, 49);
export const bgMagenta = kolorist(45, 49);
export const bgCyan = kolorist(46, 49);
export const bgWhite = kolorist(107, 49);
export const bgGray = kolorist(100, 49);

export const bgLightRed = kolorist(101, 49);
export const bgLightGreen = kolorist(102, 49);
export const bgLightYellow = kolorist(103, 49);
export const bgLightBlue = kolorist(104, 49);
export const bgLightMagenta = kolorist(105, 49);
export const bgLightCyan = kolorist(106, 49);
export const bgLightGray = kolorist(47, 49);

// 256 support
export const ansi256 = (n: number) =>
  kolorist('38;5;' + n, 0, SupportLevel.ansi256);
export const ansi256Bg = (n: number) =>
  kolorist('48;5;' + n, 0, SupportLevel.ansi256);

// Links
const OSC = '\u001B]';
const BEL = '\u0007';
const SEP = ';';

export function link(text: string, url: string) {
  return options.enabled
    ? OSC + '8' + SEP + SEP + url + BEL + text + OSC + '8' + SEP + SEP + BEL
    : `${text} (\u200B${url}\u200B)`;
}
