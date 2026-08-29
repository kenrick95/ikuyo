/** Guardrail shared by destructive WebMCP tools. */
export function deletionConfirmationSchema(): Record<string, unknown> {
  return {
    type: 'string',
    enum: ['DELETE'],
    description:
      'Required destructive-action confirmation. Set to DELETE only after the user has explicitly confirmed this permanent deletion.',
  };
}

export function requireDeletionConfirmation(value: unknown): void {
  if (value !== 'DELETE') {
    throw new Error(
      'Deletion requires confirmDelete: "DELETE" after explicit user confirmation.',
    );
  }
}
