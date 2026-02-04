export function* progress<T>(iterator: Iterable<T>): Iterable<T> {
  for (const item of iterator) {
    yield item;
  }
}
