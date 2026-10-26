import { spawn } from 'node:child_process';

export function openPath(target: string): void {
  const platform = process.platform;
  const child =
    platform === 'win32'
      ? spawn('cmd.exe', ['/c', 'start', '', target], { detached: true, stdio: 'ignore' })
      : platform === 'darwin'
        ? spawn('open', [target], { detached: true, stdio: 'ignore' })
        : spawn('xdg-open', [target], { detached: true, stdio: 'ignore' });

  child.on('error', () => {
    // abrir o navegador e conveniencia; falha nao deve quebrar o comando
  });
  child.unref();
}
