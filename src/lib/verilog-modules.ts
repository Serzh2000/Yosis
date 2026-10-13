/** Keep source offsets so that only a real declaration, never an explanation, is renamed. */
export function moduleDeclarations(source: string): Array<{ name: string; start: number }> {
  const masked = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"(?:\\.|[^"\\])*"/g, (token) =>
    token.replace(/[^\r\n]/g, ' '),
  );
  return [
    ...masked.matchAll(/\bmodule\s+(?:(?:automatic|static)\s+)?([A-Za-z_][A-Za-z0-9_$]*)/g),
  ].map((match) => ({ name: match[1], start: match.index! + match[0].lastIndexOf(match[1]) }));
}
