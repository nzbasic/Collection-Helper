export const limitTextLength = (string: string, number: number): string => {
  return string.length > number ? string.slice(0, number) + "..." : string;
};
