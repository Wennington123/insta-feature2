const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

const wrap = (code: string) => (text: string) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : text);

export const c = {
  bold: wrap('1'),
  dim: wrap('2'),
  red: wrap('31'),
  green: wrap('32'),
  yellow: wrap('33'),
  blue: wrap('34'),
  cyan: wrap('36'),
  magenta: wrap('35'),
};

export function heading(text: string): void {
  console.log(`\n${c.bold(text)}`);
}

export function info(text: string): void {
  console.log(text);
}

export function ok(text: string): void {
  console.log(`${c.green('ok')}  ${text}`);
}

export function warn(text: string): void {
  console.log(`${c.yellow('warn')} ${text}`);
}

export function error(text: string): void {
  console.error(`${c.red('erro')} ${text}`);
}

export function step(text: string): void {
  console.log(`${c.cyan('>')} ${text}`);
}

export function maskToken(token: string | undefined): string {
  if (!token) return '(ausente)';
  if (token.length <= 10) return '***';
  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}

export function bullet(label: string, value: string): void {
  console.log(`  ${c.dim(label.padEnd(18))} ${value}`);
}
