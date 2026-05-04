/** Extract error message safely from unknown catch values. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Internal server error";
}

/** Check if an unknown error has a specific message (for domain errors thrown as Error). */
export function isErrorWithMessage(error: unknown, message: string): boolean {
  return error instanceof Error && error.message === message;
}
