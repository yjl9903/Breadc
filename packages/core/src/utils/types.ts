// See https://twitter.com/mattpocockuk/status/1622730173446557697
// export type Identity<T> = T;
// type Prettify<T> = Identity<{ [K in keyof T]: T[K] }>
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type IsEqual<T, U> = (<G>() => G extends T ? 1 : 0) extends <G>() => G extends U ? 1 : 0 ? true : false;

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export type Lowercase =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z';

export type Uppercase =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z';

export type Letter = Lowercase | Uppercase;

export type Dash = '-';
