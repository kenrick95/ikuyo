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

        foreach (self::TABLES as $entity => $table) {
            $file = $directory . '/entities/' . $entity . '.jsonl';
            if (!is_file($file)) {
                continue;
            }
            $records = $this->readJsonLines($file);
            $counts[$entity] = count($records);
        }

        $expected = $this->readConfigCounts($directory);
        $verification = [];
        foreach ($counts as $entity => $actual) {
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

        $this->info('Import complete.');
        return self::SUCCESS;
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

    /** @return list<array{entity: array<string, mixed>, createdAt?: mixed}> */
    private function readJsonLines(string $file): array
    {
        $records = [];
        $handle = fopen($file, 'rb');
        if (!$handle) throw new RuntimeException("Unable to read {$file}");
        while (($line = fgets($handle)) !== false) {
            if (trim($line) === '') continue;
            $record = json_decode($line, true, 512, JSON_THROW_ON_ERROR);
            if (!isset($record['entity']['id'])) {
                throw new RuntimeException("Missing entity.id in {$file}");
            }
            $records[] = $record;
        }
        fclose($handle);
        return $records;
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

    private function importEntity(string $directory, string $entity): void
    {
        foreach ($this->records($directory, $entity) as $record) {
            $source = $record['entity'];
            $row = $this->mapEntity($entity, $source, $record['createdAt'] ?? null);
            if ($entity === 'tripUser' && ($row['trip_id'] ?? null) === null || $entity === 'tripUser' && ($row['user_id'] ?? null) === null) {
                throw new RuntimeException(
                    'Unresolved tripUser link for ' . $source['id']
                    . '\n  trip = ' . json_encode($source['trip'] ?? null, JSON_UNESCAPED_UNICODE)
                    . '\n  user = ' . json_encode($source['user'] ?? null, JSON_UNESCAPED_UNICODE)
                    . '\n  raw entity = ' . json_encode($source, JSON_UNESCAPED_UNICODE)
                );
            }
            if ($row !== []) $this->upsert(self::TABLES[$entity], $row);
        }
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
            'activity' => $this->child($source, $created, $updated, ['title','location','description','flags','icon'], ['timestampStart'=>'timestamp_start_ms','timestampEnd'=>'timestamp_end_ms','timeZoneStart'=>'timezone_start','timeZoneEnd'=>'timezone_end','locationLat'=>'location_lat','locationLng'=>'location_lng','locationZoom'=>'location_zoom','locationDestination'=>'location_destination','locationDestinationLat'=>'location_destination_lat','locationDestinationLng'=>'location_destination_lng','locationDestinationZoom'=>'location_destination_zoom']),
            'accommodation' => $this->child($source, $created, $updated, ['name','address','phoneNumber'=>'phone_number','notes'], ['timestampCheckIn'=>'check_in_ms','timestampCheckOut'=>'check_out_ms','timeZoneCheckIn'=>'tz_check_in','timeZoneCheckOut'=>'tz_check_out','locationLat'=>'location_lat','locationLng'=>'location_lng','locationZoom'=>'location_zoom']),
            'macroplan' => $this->child($source, $created, $updated, ['name','notes'], ['timestampStart'=>'timestamp_start_ms','timestampEnd'=>'timestamp_end_ms','timeZoneStart'=>'timezone_start','timeZoneEnd'=>'timezone_end']),
            'expense' => $this->child($source, $created, $updated, ['amount','amountInOriginCurrency'=>'amount_in_origin_currency','currency','currencyConversionFactor'=>'currency_conversion_factor','title','description'], ['timestampIncurred'=>'incurred_at_ms','timeZoneIncurred'=>'timezone_incurred']),
            'taskList' => $this->child($source, $created, $updated, ['title','index','status'], []),
            'task' => $this->child($source, $created, $updated, ['index','title','description','status','dueAt'=>'due_at_ms','completedAt'=>'completed_at_ms'], []),
            'commentGroup' => $this->child($source, $created, $updated, ['status'], []),
            'commentGroupObject' => $this->mapCommentObject($source, $created, $updated),
            'comment' => $this->child($source, $created, $updated, ['content'], []),
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

    private function child(array $source, int $created, int $updated, array $fields, array $mapped): array
    {
        $row = ['id' => (string) $source['id'], 'created_at_ms' => $created, 'updated_at_ms' => $updated];
        foreach ($fields as $from => $to) {
            if (is_int($from)) { $from = $to; }
            $row[$to] = $source[$from] ?? null;
        }
        foreach ($mapped as $from => $to) $row[$to] = $source[$from] ?? null;
        foreach (['trip_id' => 'trip', 'task_list_id' => 'taskList', 'comment_group_id' => 'commentGroup', 'user_id' => 'user'] as $column => $link) {
            if (array_key_exists($link, $source)) $row[$column] = $this->linkId($source[$link]);
        }
        if (array_key_exists('object', $source)) $row['comment_group_id'] = $this->linkId($source['object']);
        return $row;
    }

    private function upsert(string $table, array $row): void
    {
        DB::table($table)->updateOrInsert(['id' => $row['id']], $row);
    }

    private function truncateTables(): void
    {
        Schema::disableForeignKeyConstraints();
        foreach (array_reverse(array_values(self::TABLES)) as $table) DB::table($table)->truncate();
        Schema::enableForeignKeyConstraints();
    }

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

    /** @return list<array{entity: array<string, mixed>, createdAt?: mixed}> */
    private function records(string $directory, string $entity): array
    {
        $file = $directory . '/entities/' . $entity . '.jsonl';
        return is_file($file) ? $this->readJsonLines($file) : [];
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