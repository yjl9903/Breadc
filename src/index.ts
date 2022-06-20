import { Breadc } from './breadc';

interface Option {
  version?: string;
}

export default function breadc(name: string, option: Option = {}) {
  return new Breadc(name, { version: option.version ?? 'unknown' });
}
