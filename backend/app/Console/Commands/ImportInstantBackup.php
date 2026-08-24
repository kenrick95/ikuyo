<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use ZipArchive;

class ImportInstantBackup extends Command
{
    protected $signature = 'instant:import
        {backup : Path to an Instant backup ZIP or extracted directory}
        {--dry-run : Parse and report counts without writing}
        {--truncate : Empty application tables before importing}
        {--json : Print parsed entity counts as JSON}
        {--verify-config : Compare counts with config.json and fail on mismatch}';

    protected $description = 'Import an InstantDB backup JSONL export into MySQL';

    /** Instant entity name => local table. */
    private const TABLES = [
        'user' => 'users',
        'trip' => 'trips',
        'tripUser' => 'trip_user',
        'activity' => 'activities',
        'accommodation' => 'accommodations',
        'macroplan' => 'macro_plans',
        'expense' => 'expenses',
        'taskList' => 'task_lists',
        'task' => 'tasks',
        'commentGroup' => 'comment_groups',
        'commentGroupObject' => 'comment_group_objects',
        'comment' => 'comments',
    ];

    public function handle(): int
    {
        $source = $this->argument('backup');
        $directory = $this->prepareSource($source);
        $counts = [];

        foreach (array_unique([...array_keys(self::TABLES), '$users']) as $entity) {
            $file = $directory . '/entities/' . $entity . '.jsonl';
            if (!is_file($file)) {
                continue;
            }
            // Stream the count so a production-sized backup is not materialized
            // into memory just to be verified.
            $counts[$entity] = iterator_count($this->readJsonLines($file));
        }

        $expected = $this->readConfigCounts($directory);
        $verification = [];
        // Iterate both tables-with-files and expected config entities, so a missing
        // JSONL file still fails verification instead of silently passing.
        foreach (array_unique([...array_keys(self::TABLES), '$users', ...array_keys($expected)]) as $entity) {
            $actual = $counts[$entity] ?? 0;
            $verification[$entity] = [
                'expected' => $expected[$entity] ?? null,
                'actual' => $actual,
                'ok' => !isset($expected[$entity]) || $expected[$entity] === $actual,
            ];
        }
        $this->table(['entity', 'expected', 'actual', 'status'], collect($verification)->map(fn ($row, $entity) => [$entity, $row['expected'] ?? '-', $row['actual'], $row['ok'] ? 'ok' : 'MISMATCH'])->values()->all());
        if ($this->option('json')) {
            $this->line(json_encode(['counts' => $counts, 'verification' => $verification], JSON_THROW_ON_ERROR));
        }
        if ($this->option('verify-config') && collect($verification)->contains(fn (array $row): bool => !$row['ok'])) {
            $this->error('Entity counts do not match config.json.');
            return self::FAILURE;
        }

        if ($this->option('dry-run')) {
            $this->info('Dry run complete; no rows written.');
            return self::SUCCESS;
        }

        if ($this->option('truncate') && !$this->confirm('Truncate application tables before import?')) {
            return self::FAILURE;
        }

        DB::transaction(function () use ($directory): void {
            if ($this->option('truncate')) {
                $this->truncateTables();
            }

            // Parents before foreign-key children.
            $this->importUsers($directory);
            $this->importEntity($directory, 'trip');
            $this->collectTripLinksFromParents($directory);
            $this->importEntity($directory, 'tripUser');
            $this->importEntity($directory, 'activity');
            $this->importEntity($directory, 'accommodation');
            $this->importEntity($directory, 'macroplan');
            $this->importEntity($directory, 'expense');
            $this->importEntity($directory, 'taskList');
            $this->importEntity($directory, 'task');
            $this->importEntity($directory, 'commentGroup');
            $this->importEntity($directory, 'commentGroupObject');
            $this->importEntity($directory, 'comment');
        });

        if ($this->orphanedTripUsers > 0) {
            $this->warn('Skipped ' . $this->orphanedTripUsers . ' orphaned tripUser membership(s).');
        }
        if ($this->orphanedChildren > 0) {
            $this->warn('Skipped ' . $this->orphanedChildren . ' orphaned child record(s).');
        }
        $this->info('Import complete.');

        $this->printPostImportReport($directory);
        $this->cleanupExtractedSource($source, $directory);
        return self::SUCCESS;
    }

    private function printPostImportReport(string $directory): void
    {
        $expected = $this->readConfigCounts($directory);
        $rows = [];
        foreach (self::TABLES as $entity => $table) {
            $actual = DB::table($table)->count();
            $exp = $expected[$entity] ?? null;
            $rows[] = [
                $entity,
                $exp === null ? '-' : (string) $exp,
                (string) $actual,
                $exp === null ? '-' : (string) ($exp - $actual) . ' skipped',
            ];
        }
        $this->newLine();
        $this->info('Post-import verification:');
        $this->table(['entity', 'config', 'imported', 'diff'], $rows);
    }

    private function cleanupExtractedSource(string $source, string $directory): void
    {
        if (is_file($source) && str_starts_with($directory, storage_path('app/instant-import/'))) {
            \Illuminate\Support\Facades\File::deleteDirectory($directory);
        }
    }

    private function prepareSource(string $source): string
    {
        if (is_dir($source)) {
            return rtrim($source, '/');
        }
        if (!is_file($source)) {
            throw new RuntimeException("Backup not found: {$source}");
        }

        $directory = storage_path('app/instant-import/' . bin2hex(random_bytes(8)));
        if (!mkdir($directory, 0700, true) && !is_dir($directory)) {
            throw new RuntimeException("Unable to create import directory: {$directory}");
        }
        $zip = new ZipArchive();
        if ($zip->open($source) !== true || !$zip->extractTo($directory)) {
            throw new RuntimeException("Unable to extract backup: {$source}");
        }
        return $directory;
    }

    /**
     * Stream the JSONL records of a file one at a time (generator), so a
     * production-sized backup never has to be fully loaded into memory.
     *
     * @return \Generator<array{entity: array<string, mixed>, createdAt?: mixed}>
     */
    private function readJsonLines(string $file): \Generator
    {
        $handle = fopen($file, 'rb');
        if (!$handle) throw new RuntimeException("Unable to read {$file}");
        try {
            while (($line = fgets($handle)) !== false) {
                if (trim($line) === '') continue;
                $record = json_decode($line, true, 512, JSON_THROW_ON_ERROR);
                if (!isset($record['entity']['id'])) {
                    throw new RuntimeException("Missing entity.id in {$file}");
                }
                yield $record;
            }
        } finally {
            fclose($handle);
        }
    }

    private function importUsers(string $directory): void
    {
        $users = $this->records($directory, 'user');
        $authUsers = $this->records($directory, '$users');
        $authById = [];
        foreach ($authUsers as $record) {
            $entity = $record['entity'];
            $authById[$entity['id']] = $entity;
        }

        foreach ($users as $record) {
            $entity = $record['entity'];
            $this->collectTripUserLink($entity['tripUser'] ?? null, 'user_id', $entity['id']);
            $this->collectCommentLink($entity['comment'] ?? null, 'user_id', $entity['id']);
            $authId = $this->linkId($entity['$users'] ?? null);
            $auth = $authId ? ($authById[$authId] ?? []) : [];
            $this->upsert('users', [
                'id' => $entity['id'],
                'email' => $entity['email'] ?? $auth['email'] ?? null,
                'handle' => $entity['handle'] ?? 'user_' . substr(str_replace('-', '', $entity['id']), 0, 12),
                'handle_key' => isset($entity['handle']) ? strtolower($entity['handle']) : null,
                'auth_namespace_id' => $authId,
                'image_url' => $auth['imageURL'] ?? null,
                'activated' => (int) ($entity['activated'] ?? true),
                'preferred_region' => $entity['preferredRegion'] ?? null,
                'preferred_currency' => $entity['preferredCurrency'] ?? null,
                'preferred_timezone' => $entity['preferredTimeZone'] ?? null,
                'last_login_at' => $this->timestampMs($entity['lastLoginAt'] ?? null),
                'created_at_ms' => $this->timestampMs($entity['createdAt'] ?? $record['createdAt'] ?? null),
                'updated_at_ms' => $this->timestampMs($entity['lastUpdatedAt'] ?? null) ?? $this->timestampMs($entity['createdAt'] ?? $record['createdAt'] ?? null) ?? 0,
            ]);
        }
    }

    private function collectTripLinksFromParents(string $directory): void
    {
        foreach ($this->records($directory, 'trip') as $record) {
            $entity = $record['entity'];
            foreach (['activity', 'accommodation', 'macroplan', 'expense', 'taskList', 'commentGroup'] as $child) {
                $this->collectOneSideLink($child, $entity[$child] ?? null, $entity['id']);
            }
            $this->collectTripUserLink($entity['tripUser'] ?? null, 'trip_id', $entity['id']);
        }
        foreach ($this->records($directory, 'taskList') as $record) {
            $entity = $record['entity'];
            $this->collectOneSideLink('task', $entity['task'] ?? null, $entity['id']);
        }
        foreach ($this->records($directory, 'commentGroup') as $record) {
            $entity = $record['entity'];
            $this->collectCommentLink($entity['comment'] ?? null, 'comment_group_id', $entity['id']);
        }
    }

    private function collectCommentLink(mixed $ids, string $column, string $parentId): void
    {
        if ($ids === null) return;
        foreach ((array) $ids as $id) {
            $commentId = $this->linkId($id);
            if ($commentId === null) continue;
            $this->commentLinks[$commentId][$column] = $parentId;
        }
    }

    private function collectOneSideLink(string $child, mixed $ids, string $parentId): void
    {
        if ($ids === null) return;
        foreach ((array) $ids as $id) {
            $childId = $this->linkId($id);
            if ($childId === null) continue;
            $this->parentChildLinks[$child][$childId] = $parentId;
        }
    }

    private function collectTripUserLink(mixed $ids, string $column, string $parentId): void
    {
        if ($ids === null) return;
        foreach ((array) $ids as $id) {
            $tripUserId = $this->linkId($id);
            if ($tripUserId === null) continue;
            $this->tripUserLinks[$tripUserId][$column] = $parentId;
        }
    }

    private function importEntity(string $directory, string $entity): void
    {
        foreach ($this->records($directory, $entity) as $record) {
            $source = $record['entity'];
            $row = $this->mapEntity($entity, $source, $record['createdAt'] ?? null);

            // comment.user is a has-one link stored on the comment itself in real
            // backups (plain id, {id:...}, or an id array); fall back to parent array.
            if ($entity === 'comment' && ($row['user_id'] ?? null) === null && array_key_exists('user', $source)) {
                $row['user_id'] = $this->linkId($source['user']);
            }

            // The real backup stores parent-side has-many arrays, so a child's FK may
            // not appear on the child itself. Resolve from the collected parent maps
            // (and from the child's own field when present), then skip orphans.
            $this->resolveChildFk($entity, $row);

            // Skip rows whose resolved FK points at a parent that was itself
            // skipped (orphaned), otherwise the foreign-key insert would fail.
            if ($this->hasSkippedParent($entity, $row)) {
                $this->warn($this->treeSkipped($entity, $row, 'parent'));
                continue;
            }

            if ($entity === 'tripUser' && ($row['trip_id'] === null || $row['user_id'] === null)) {
                $this->warn($this->treeSkipped($entity, $row, $row['trip_id'] === null ? 'trip_id' : 'user_id'));
                continue;
            }
            if ($this->requiresFk($entity, $row) && ($row['trip_id'] ?? null) === null) {
                // trip child missing its trip link
                $this->warn($this->treeSkipped($entity, $row, 'trip_id'));
                continue;
            }
            if ($entity === 'task' && ($row['task_list_id'] ?? null) === null) {
                $this->warn($this->treeSkipped($entity, $row, 'task_list_id'));
                continue;
            }
            if ($entity === 'comment' && (($row['comment_group_id'] ?? null) === null || ($row['user_id'] ?? null) === null)) {
                $this->warn($this->treeSkipped($entity, $row, ($row['comment_group_id'] ?? null) === null ? 'comment_group_id' : 'user_id'));
                continue;
            }

            if ($row !== []) $this->upsert(self::TABLES[$entity], $row);
        }
    }

    /** True if this row's FK references a parent that was skipped as an orphan. */
    private function hasSkippedParent(string $entity, array $row): bool
    {
        $parent = match ($entity) {
            'tripUser', 'activity', 'accommodation', 'macroplan', 'expense', 'taskList', 'commentGroup' => ['trip', $row['trip_id'] ?? null],
            'task' => ['taskList', $row['task_list_id'] ?? null],
            'comment' => ['commentGroup', $row['comment_group_id'] ?? null],
            default => null,
        };
        if (!$parent) return false;
        [$parentEntity, $parentId] = $parent;
        return $parentId !== null && isset($this->skipped[$parentEntity][$parentId]);
    }

    private function treeSkipped(string $entity, array $row, string $field): string
    {
        $this->orphanedChildren++;
        $this->skipped[$entity][$row['id'] ?? ''] = true;
        if ($this->orphanedChildren <= 50) {
            return 'Skipping orphaned ' . $entity . ' ' . ($row['id'] ?? '') . ' (' . $field . '=missing-or-orphaned)';
        }
        return '';
    }

    private function resolveChildFk(string $entity, array &$row): void
    {
        $ownerMap = ['activity' => 'trip_id', 'accommodation' => 'trip_id', 'macroplan' => 'trip_id', 'expense' => 'trip_id', 'taskList' => 'trip_id', 'commentGroup' => 'trip_id'];
        if (isset($ownerMap[$entity])) {
            $col = $ownerMap[$entity];
            $row[$col] = $row[$col] ?? $this->parentChildLinks[$entity][$row['id']] ?? null;
        }
        if ($entity === 'tripUser') {
            $links = $this->tripUserLinks[$row['id']] ?? [];
            $row['trip_id'] = $row['trip_id'] ?? $links['trip_id'] ?? null;
            $row['user_id'] = $row['user_id'] ?? $links['user_id'] ?? null;
        }
        if ($entity === 'task') $row['task_list_id'] = $row['task_list_id'] ?? $this->parentChildLinks['task'][$row['id']] ?? null;
        if ($entity === 'comment') {
            $links = $this->commentLinks[$row['id']] ?? [];
            $row['comment_group_id'] = $row['comment_group_id'] ?? $links['comment_group_id'] ?? null;
            $row['user_id'] = $row['user_id'] ?? $links['user_id'] ?? null;
        }
    }

    private function requiresFk(string $entity, array $row): bool
    {
        return in_array($entity, ['tripUser', 'activity', 'accommodation', 'macroplan', 'expense', 'taskList', 'commentGroup'], true);
    }

    /** @return array<string, mixed> */
    private function mapEntity(string $entity, array $source, mixed $createdAt): array
    {
        $id = (string) $source['id'];
        $created = $this->timestampMs($source['createdAt'] ?? $createdAt) ?? 0;
        $updated = $this->timestampMs($source['lastUpdatedAt'] ?? null) ?? $created;

        return match ($entity) {
            'trip' => [
                'id' => $id, 'title' => $source['title'] ?? '', 'region' => $source['region'] ?? '',
                'currency' => $source['currency'] ?? '', 'origin_region' => $source['originRegion'] ?? null,
                'origin_currency' => $source['originCurrency'] ?? null, 'origin_timezone' => $source['originTimeZone'] ?? null,
                'timezone' => $source['timeZone'] ?? '', 'timestamp_start_ms' => $source['timestampStart'] ?? 0,
                'timestamp_end_ms' => $source['timestampEnd'] ?? 0, 'sharing_level' => $source['sharingLevel'] ?? 0,
                'public_show_expenses' => $source['publicShowExpenses'] ?? null, 'public_show_tasks' => $source['publicShowTasks'] ?? null,
                'public_show_comments' => $source['publicShowComments'] ?? null, 'viewer_show_expenses' => $source['viewerShowExpenses'] ?? null,
                'viewer_show_tasks' => $source['viewerShowTasks'] ?? null, 'viewer_show_comments' => $source['viewerShowComments'] ?? null,
                'created_at_ms' => $created, 'updated_at_ms' => $updated,
            ],
            'tripUser' => ['id' => $id, 'trip_id' => $this->linkId($source['trip'] ?? null), 'user_id' => $this->linkId($source['user'] ?? null), 'role' => $this->role($source['role'] ?? null), 'created_at_ms' => $created, 'updated_at_ms' => $updated],
            'activity' => $this->child($source, $created, $updated, ['title','location','description','flags','icon'], ['timestampStart'=>'timestamp_start_ms','timestampEnd'=>'timestamp_end_ms','timeZoneStart'=>'timezone_start','timeZoneEnd'=>'timezone_end','locationLat'=>'location_lat','locationLng'=>'location_lng','locationZoom'=>'location_zoom','locationDestination'=>'location_destination','locationDestinationLat'=>'location_destination_lat','locationDestinationLng'=>'location_destination_lng','locationDestinationZoom'=>'location_destination_zoom'], 'trip'),
            'accommodation' => $this->child($source, $created, $updated, ['name','address','phoneNumber'=>'phone_number','notes'], ['timestampCheckIn'=>'check_in_ms','timestampCheckOut'=>'check_out_ms','timeZoneCheckIn'=>'tz_check_in','timeZoneCheckOut'=>'tz_check_out','locationLat'=>'location_lat','locationLng'=>'location_lng','locationZoom'=>'location_zoom'], 'trip'),
            'macroplan' => $this->child($source, $created, $updated, ['name','notes'], ['timestampStart'=>'timestamp_start_ms','timestampEnd'=>'timestamp_end_ms','timeZoneStart'=>'timezone_start','timeZoneEnd'=>'timezone_end'], 'trip'),
            'expense' => $this->child($source, $created, $updated, ['amount','amountInOriginCurrency'=>'amount_in_origin_currency','currency','currencyConversionFactor'=>'currency_conversion_factor','title','description'], ['timestampIncurred'=>'incurred_at_ms','timeZoneIncurred'=>'timezone_incurred'], 'trip'),
            'taskList' => $this->child($source, $created, $updated, ['title','index','status'], [], 'trip'),
            'task' => $this->child($source, $created, $updated, ['index','title','description','status','dueAt'=>'due_at_ms','completedAt'=>'completed_at_ms'], [], 'taskList'),
            'commentGroup' => $this->child($source, $created, $updated, ['status'], [], 'trip'),
            'commentGroupObject' => $this->mapCommentObject($source, $created, $updated),
            'comment' => $this->child($source, $created, $updated, ['content'], [], 'commentGroup'),
            default => [],
        };
    }

    private function mapCommentObject(array $source, int $created, int $updated): array
    {
        $row = [
            'id' => (string) $source['id'],
            'comment_group_id' => $this->linkId($source['commentGroup'] ?? null) ?? (string) $source['id'],
            'object_type' => isset($source['type']) ? $this->objectType((string) $source['type']) : 0,
            'object_id' => null,
            'created_at_ms' => $created,
            'updated_at_ms' => $updated,
        ];
        foreach (['trip', 'activity', 'accommodation', 'macroplan', 'expense', 'task'] as $type) {
            if (array_key_exists($type, $source)) {
                $row['object_type'] = $this->objectType($type);
                $row['object_id'] = $this->linkId($source[$type]);
                break;
            }
        }
        return $row;
    }

    private function child(array $source, int $created, int $updated, array $fields, array $mapped, ?string $parentLink): array
    {
        $row = ['id' => (string) $source['id'], 'created_at_ms' => $created, 'updated_at_ms' => $updated];
        // InstantDB string fields that the schema marks as required are NOT NULL
        // locally; normalize a missing/absent source field to an empty string
        // (matching the frontend's "" convention) instead of null.
        $requiredStringFields = ['title', 'location', 'description', 'name', 'notes', 'address', 'phone_number', 'content', 'currency', 'timezone_incurred'];
        foreach ($fields as $from => $to) {
            if (is_int($from)) { $from = $to; }
            $value = $source[$from] ?? null;
            $row[$to] = in_array($to, $requiredStringFields, true) ? (string) ($value ?? '') : $value;
        }
        foreach ($mapped as $from => $to) $row[$to] = $source[$from] ?? null;
        $linkColumn = ['trip' => 'trip_id', 'taskList' => 'task_list_id', 'commentGroup' => 'comment_group_id'][$parentLink ?? ''] ?? null;
        if ($linkColumn !== null && array_key_exists($parentLink, $source)) {
            $row[$linkColumn] = $this->linkId($source[$parentLink]);
        }
        return $row;
    }

    private function upsert(string $table, array $row): void
    {
        DB::table($table)->updateOrInsert(['id' => $row['id']], $row);
    }

    private function truncateTables(): void
    {
        Schema::disableForeignKeyConstraints();
        // Use delete() instead of truncate(): TRUNCATE implicitly commits in
        // MySQL, which would commit the surrounding import transaction early and
        // make the import non-rollback-safe.
        foreach (array_reverse(array_values(self::TABLES)) as $table) DB::table($table)->delete();
        Schema::enableForeignKeyConstraints();
    }

    /** @var array<string, array<string, string>> single-parent childEntity => childId => parentId */
    private array $parentChildLinks = [];
    /** @var array<string, array{trip_id?: string, user_id?: string}> tripUserId => resolved links */
    private array $tripUserLinks = [];
    /** @var array<string, array{comment_group_id?: string, user_id?: string}> commentId => resolved links */
    private array $commentLinks = [];
    private int $orphanedTripUsers = 0;
    private int $orphanedChildren = 0;

    /** @var array<string, array<string, true>> entity => skipped row ids (for descendant pruning). */
    private array $skipped = [];

    /** @return array<string, int> */
    private function readConfigCounts(string $directory): array
    {
        $file = $directory . '/config.json';
        if (!is_file($file)) return [];
        $config = json_decode((string) file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
        $candidates = $config['entityCounts'] ?? $config['entities'] ?? $config['counts'] ?? [];
        $counts = [];
        foreach ($candidates as $name => $value) {
            if (is_int($value) || is_float($value)) $counts[(string) $name] = (int) $value;
            elseif (is_array($value) && isset($value['count'])) $counts[(string) $name] = (int) $value['count'];
        }
        return $counts;
    }

    /**
     * Stream the JSONL records of one entity.
     *
     * @return \Generator<array{entity: array<string, mixed>, createdAt?: mixed}>
     */
    private function records(string $directory, string $entity): \Generator
    {
        $file = $directory . '/entities/' . $entity . '.jsonl';
        if (is_file($file)) yield from $this->readJsonLines($file);
    }

    private function linkId(mixed $value): ?string
    {
        if ($value === null || $value === '') return null;
        if (is_string($value)) return $value;
        if (is_int($value) || is_float($value)) return (string) $value;
        if (is_array($value)) {
            // has-one link shaped as {"id": "..."}
            if (array_key_exists('id', $value)) return $this->linkId($value['id']);
            // has-many link: an array of ids and/or {"id": ...} objects.
            foreach ($value as $item) {
                $resolved = $this->linkId($item);
                if ($resolved !== null) return $resolved;
            }
        }
        return null;
    }

    private function timestampMs(mixed $value): ?int
    {
        if ($value === null || $value === '') return null;
        if (is_numeric($value)) return (int) $value;
        $time = strtotime((string) $value);
        return $time === false ? null : $time * 1000;
    }

    private function role(mixed $role): int
    {
        return match ($role) { 'owner', 0, '0' => 0, 'editor', 1, '1' => 1, default => 2 };
    }

    private function objectType(string $type): int
    {
        return match ($type) { 'trip' => 0, 'activity' => 1, 'accommodation' => 2, 'macroplan' => 3, 'expense' => 4, 'task' => 5, default => 0 };
    }
}