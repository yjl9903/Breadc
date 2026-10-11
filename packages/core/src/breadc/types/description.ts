/** A literal shell command with an optional explanatory comment. */
export interface HelpExample {
  command: string;
  comment?: string;
}

/** Full application prose. Line breaks, paragraphs and indentation are preserved. */
export type BreadcDescription =
  | string
  | {
      text: string;
      examples?: readonly HelpExample[];
    };

/** The parent list uses the first nonempty summary line; the command page shows all prose. */
export type CommandDescription =
  | string
  | {
      summary: string;
      /** Additional prose, displayed as a separate paragraph after the summary. */
      text?: string;
      examples?: readonly HelpExample[];
    };
