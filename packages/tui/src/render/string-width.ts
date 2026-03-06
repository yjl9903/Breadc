/**
 * Fork from string-width@8.2.0
 */

import stripAnsi from 'strip-ansi';
import { eastAsianWidth, type Options as EastAsianWidthOptions } from 'get-east-asian-width';

/**
Logic:
- Segment graphemes to match how terminals render clusters.
- Width rules:
	1. Skip non-printing clusters (Default_Ignorable, Control, pure Mark, lone Surrogates). Tabs are ignored by design.
	2. RGI emoji clusters (\p{RGI_Emoji}) are double-width.
	3. Minimally-qualified/unqualified emoji clusters (ZWJ sequences with 2+ Extended_Pictographic, or keycap sequences) are double-width.
	4. Otherwise use East Asian Width of the cluster's first visible code point, and add widths for trailing Halfwidth/Fullwidth Forms within the same cluster (e.g., dakuten/handakuten/prolonged sound mark).
*/

export type Options = {
  /**
	Count [ambiguous width characters](https://www.unicode.org/reports/tr11/#Ambiguous) as having narrow width (count of 1) instead of wide width (count of 2).

	@default true

	> Ambiguous characters behave like wide or narrow characters depending on the context (language tag, script identification, associated font, source of data, or explicit markup; all can provide the context). __If the context cannot be established reliably, they should be treated as narrow characters by default.__
	> - http://www.unicode.org/reports/tr11/
	*/
  readonly ambiguousIsNarrow?: boolean;

  /**
	Whether [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code) should be counted.

	@default false
	*/
  readonly countAnsiEscapeCodes?: boolean;
};

const segmenter = new Intl.Segmenter();

// Whole-cluster zero-width
const zeroWidthClusterRegex = /^(?:\p{Default_Ignorable_Code_Point}|\p{Control}|\p{Format}|\p{Mark}|\p{Surrogate})+$/v;

// Pick the base scalar if the cluster starts with Prepend/Format/Marks
const leadingNonPrintingRegex = /^[\p{Default_Ignorable_Code_Point}\p{Control}\p{Format}\p{Mark}\p{Surrogate}]+/v;

// RGI emoji sequences
const rgiEmojiRegex = /^\p{RGI_Emoji}$/v;

// Detect minimally-qualified/unqualified emoji sequences (missing VS16 but still render as double-width)
const unqualifiedKeycapRegex = /^[\d#*]\u20E3$/;
const extendedPictographicRegex = /\p{Extended_Pictographic}/gu;

function isDoubleWidthNonRgiEmojiSequence(segment: string) {
  // Real emoji clusters are < 30 chars; guard against pathological input
  if (segment.length > 50) {
    return false;
  }

  if (unqualifiedKeycapRegex.test(segment)) {
    return true;
  }

  // ZWJ sequences with 2+ Extended_Pictographic
  if (segment.includes('\u200D')) {
    const pictographics = segment.match(extendedPictographicRegex);
    return pictographics !== null && pictographics.length >= 2;
  }

  return false;
}

function baseVisible(segment: string) {
  return segment.replace(leadingNonPrintingRegex, '');
}

function isZeroWidthCluster(segment: string) {
  return zeroWidthClusterRegex.test(segment);
}

function trailingHalfwidthWidth(segment: string, eastAsianWidthOptions: EastAsianWidthOptions) {
  let extra = 0;
  if (segment.length > 1) {
    for (const char of segment.slice(1)) {
      if (char >= '\uFF00' && char <= '\uFFEF') {
        extra += eastAsianWidth(char.codePointAt(0)!, eastAsianWidthOptions);
      }
    }
  }

  return extra;
}

export function stringWidth(input: string, options: Options = {}) {
  if (typeof input !== 'string' || input.length === 0) {
    return 0;
  }

  const { ambiguousIsNarrow = true, countAnsiEscapeCodes = false } = options;

  let string = input;

  // Avoid calling stripAnsi when there are no ANSI escape sequences (ESC = 0x1B, CSI = 0x9B)
  if (!countAnsiEscapeCodes && (string.includes('\u001B') || string.includes('\u009B'))) {
    string = stripAnsi(string);
  }

  if (string.length === 0) {
    return 0;
  }

  // Fast path: printable ASCII (0x20–0x7E) needs no segmenter, regex, or EAW lookup — width equals length.
  if (/^[\u0020-\u007E]*$/.test(string)) {
    return string.length;
  }

  let width = 0;
  const eastAsianWidthOptions = { ambiguousAsWide: !ambiguousIsNarrow };

  for (const { segment } of segmenter.segment(string)) {
    // Zero-width / non-printing clusters
    if (isZeroWidthCluster(segment)) {
      continue;
    }

    // Emoji width logic
    if (rgiEmojiRegex.test(segment) || isDoubleWidthNonRgiEmojiSequence(segment)) {
      width += 2;
      continue;
    }

    // Everything else: EAW of the cluster’s first visible scalar
    const codePoint = baseVisible(segment).codePointAt(0);
    width += eastAsianWidth(codePoint!, eastAsianWidthOptions);

    // Add width for trailing Halfwidth and Fullwidth Forms (e.g., ﾞ, ﾟ, ｰ)
    width += trailingHalfwidthWidth(segment, eastAsianWidthOptions);
  }

  return width;
}
