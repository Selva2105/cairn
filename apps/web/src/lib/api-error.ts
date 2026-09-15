export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }

  static async fromResponse(res: Response): Promise<ApiError> {
    const body = await res.json().catch(() => null);
    const message = body?.message ?? res.statusText;
    const code = Array.isArray(message)
      ? 'VALIDATION_ERROR'
      : (body?.error?.code ?? 'UNKNOWN_ERROR');
    return new ApiError(
      res.status,
      code,
      Array.isArray(message) ? message.join(', ') : message,
    );
  }
}
