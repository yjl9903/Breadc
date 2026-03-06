export interface OutputStream {
  write(chunk: string): boolean;

  isTTY?: boolean;

  columns?: number;
}
