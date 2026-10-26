export class AppError extends Error {
  readonly hint?: string;
  readonly exitCode: number;

  constructor(message: string, options: { hint?: string; exitCode?: number } = {}) {
    super(message);
    this.name = 'AppError';
    this.hint = options.hint;
    this.exitCode = options.exitCode ?? 1;
  }
}

export function asAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) return new AppError(error.message);
  return new AppError(String(error));
}
