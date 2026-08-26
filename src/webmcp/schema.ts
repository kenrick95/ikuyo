/**
 * JSON-Schema parameter helpers + time conversion for WebMCP tools.
 *
 * WebMCP `inputSchema` entries are plain JSON Schema fragments. These helpers
 * keep schemas terse and consistent (every parameter gets a description).
 */

export type SchemaProperties = Record<string, unknown>;

export function str(description: string): Record<string, unknown> {
  return { type: 'string', description };
}

export function num(description: string): Record<string, unknown> {
  return { type: 'number', description };
}

export function int(description: string): Record<string, unknown> {
  return { type: 'integer', description };
}

/** A timestamp accepted as epoch milliseconds or an ISO-8601 date-time. */
export function epochOrIso(description: string): Record<string, unknown> {
  return {
    anyOf: [
      { type: 'number', description: 'Epoch milliseconds.' },
      {
        type: 'string',
        format: 'date-time',
        description: 'ISO-8601 date-time.',
      },
    ],
    description,
  };
}

export function bool(description: string): Record<string, unknown> {
  return { type: 'boolean', description };
}

export function strEnum(
  description: string,
  values: string[],
): Record<string, unknown> {
  return { type: 'string', enum: values, description };
}

/**
 * Accept a timestamp as either epoch milliseconds (number) or an ISO-8601
 * string; produce epoch ms for the store, or `undefined`/`null` when the input
 * is undefined/null (so optional fields can be cleared). Throws a descriptive
 * error on bad input so the agent can retry.
 */
export function toEpochMs(
  value: unknown,
  field: string,
): number | undefined | null {
  if (value === undefined || value === null || value === '') {
    return value === null ? null : undefined;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(
        `${field} must be a finite epoch-ms number or ISO string`,
      );
    }
    return value;
  }
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    if (Number.isNaN(ms)) {
      throw new Error(`${field} must be a valid ISO-8601 date string`);
    }
    return ms;
  }
  throw new Error(`${field} must be a number (epoch ms) or ISO-8601 string`);
}

/** Coerce to a string, rejecting non-strings (and throwing on undefined). */
export function asStr(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${field} is required and must be a non-empty string`);
  }
  return value;
}

/** Coerce to a finite number when the value is provided. */
export function asOptNum(
  value: unknown,
  field: string,
): number | null | undefined {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${field} must be a number`);
  return n;
}

/** Coerce optional string-or-null for nullable text fields. */
export function asOptStr(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  return value;
}

/** Like `toEpochMs` but throws when no value is provided (for required ms fields). */
export function toEpochMsRequired(value: unknown, field: string): number {
  const ms = toEpochMs(value, field);
  if (ms === undefined || ms === null || Number.isNaN(ms)) {
    throw new Error(`${field} is required (ISO-8601 date or epoch ms)`);
  }
  return ms;
}

/** Optional boolean. */
export function asOptBool(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new Error(`${field} must be a boolean`);
  return value;
}
