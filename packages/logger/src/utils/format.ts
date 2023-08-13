export const bracket = (text?: string) => {
  if (text) {
    return `[${text}]`;
  } else {
    return undefined;
  }
};
