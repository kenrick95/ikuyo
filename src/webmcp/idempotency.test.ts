import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runIdempotent } from './idempotency';

describe('runIdempotent', () => {
  beforeEach(() => localStorage.clear());

  it('returns the stored result for a repeated key', async () => {
    const create = vi.fn(async () => ({ ok: true, id: 'one' }));
    const input = { title: 'Museum', idempotencyKey: 'retry-1' };

    await expect(
      runIdempotent('activity-create', 'trip-1', 'retry-1', input, create),
    ).resolves.toEqual({ ok: true, id: 'one' });
    await expect(
      runIdempotent('activity-create', 'trip-1', 'retry-1', input, create),
    ).resolves.toEqual({ ok: true, id: 'one', idempotentReplay: true });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('rejects a key reused with different input', async () => {
    const create = vi.fn(async () => ({ ok: true, id: 'one' }));
    await runIdempotent(
      'activity-create',
      'trip-2',
      'retry-2',
      { title: 'Museum' },
      create,
    );

    await expect(
      runIdempotent(
        'activity-create',
        'trip-2',
        'retry-2',
        { title: 'Park' },
        create,
      ),
    ).rejects.toThrow('different input');
  });

  it('coalesces concurrent calls', async () => {
    const create = vi.fn(async () => ({ ok: true, id: 'one' }));
    const input = { title: 'Museum' };
    const results = await Promise.all([
      runIdempotent('activity-create', 'trip-3', 'retry-3', input, create),
      runIdempotent('activity-create', 'trip-3', 'retry-3', input, create),
    ]);

    expect(results).toEqual([
      { ok: true, id: 'one' },
      { ok: true, id: 'one' },
    ]);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('rejects concurrent calls that reuse a key with different input', async () => {
    let resolveCreate:
      | ((result: { ok: boolean; id: string }) => void)
      | undefined;
    const create = vi.fn(
      () =>
        new Promise<{ ok: boolean; id: string }>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const first = runIdempotent(
      'activity-create',
      'trip-4',
      'retry-4',
      { title: 'Museum' },
      create,
    );

    await expect(
      runIdempotent(
        'activity-create',
        'trip-4',
        'retry-4',
        { title: 'Park' },
        create,
      ),
    ).rejects.toThrow('different input');
    resolveCreate?.({ ok: true, id: 'one' });
    await expect(first).resolves.toEqual({ ok: true, id: 'one' });
    expect(create).toHaveBeenCalledTimes(1);
  });
});
