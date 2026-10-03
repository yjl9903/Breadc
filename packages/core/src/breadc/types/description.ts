/** A literal shell command with an optional explanatory comment. */
export interface Example {
  command: string;
  comment?: string;
}

/** Full application prose. Line breaks, paragraphs and indentation are preserved. */
export type AppDescription =
  | string
  | {
      description: string;
      examples?: readonly Example[];
    };

/** The parent list uses the first nonempty summary line; the command page shows all prose. */
export type CommandDescription =
  | string
  | {
      summary: string;
      /** Additional prose, displayed as a separate paragraph after the summary. */
      details?: string;
      examples?: readonly Example[];
    };
