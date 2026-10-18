<?php

declare(strict_types=1);

namespace BackupKit\Engine;

final class RetentionManager
{
    /**
     * @param list<array{key: string, bytes: int, createdAt: string}> $artifacts
     * @param array<string, mixed>|null $retention
     * @return array{deleted: list<string>, kept: list<string>}
     */
    public function selectDeletions(array $artifacts, ?array $retention): array
    {
        if ($retention === null) {
            return [
                'deleted' => [],
                'kept' => array_map(static fn (array $a): string => $a['key'], $artifacts),
            ];
        }

        usort(
            $artifacts,
            static fn (array $a, array $b): int => strcmp($b['createdAt'], $a['createdAt']),
        );

        $hasKeepRules = (bool) (
            ($retention['keepLast'] ?? null)
            || ($retention['keepDaily'] ?? null)
            || ($retention['keepWeekly'] ?? null)
            || ($retention['keepMonthly'] ?? null)
            || ($retention['keepYearly'] ?? null)
        );

        $keep = [];

        if (!empty($retention['keepLast'])) {
            foreach (array_slice($artifacts, 0, (int) $retention['keepLast']) as $a) {
                $keep[$a['key']] = true;
            }
        }

        $takeBuckets = static function (callable $keyFn, ?int $limit) use ($artifacts, &$keep): void {
            if (!$limit) {
                return;
            }
            $seen = [];
            foreach ($artifacts as $a) {
                $k = $keyFn($a['createdAt']);
                if (isset($seen[$k])) {
                    continue;
                }
                $seen[$k] = true;
                $keep[$a['key']] = true;
                if (count($seen) >= $limit) {
                    break;
                }
            }
        };

        $takeBuckets(static fn (string $iso): string => substr($iso, 0, 10), isset($retention['keepDaily']) ? (int) $retention['keepDaily'] : null);
        $takeBuckets(static function (string $iso): string {
            $ts = strtotime($iso) ?: time();
            return gmdate('o', $ts) . '-W' . gmdate('W', $ts);
        }, isset($retention['keepWeekly']) ? (int) $retention['keepWeekly'] : null);
        $takeBuckets(static fn (string $iso): string => substr($iso, 0, 7), isset($retention['keepMonthly']) ? (int) $retention['keepMonthly'] : null);
        $takeBuckets(static fn (string $iso): string => substr($iso, 0, 4), isset($retention['keepYearly']) ? (int) $retention['keepYearly'] : null);

        $now = time();
        $deleted = [];
        $kept = [];
        foreach ($artifacts as $a) {
            $ageDays = ($now - (strtotime($a['createdAt']) ?: $now)) / 86400;
            $tooOld = isset($retention['maxAgeDays']) && $ageDays > (float) $retention['maxAgeDays'];
            if ($tooOld) {
                $deleted[] = $a['key'];
                continue;
            }
            if (!$hasKeepRules || isset($keep[$a['key']])) {
                $kept[] = $a['key'];
            } else {
                $deleted[] = $a['key'];
            }
        }

        return ['deleted' => $deleted, 'kept' => $kept];
    }
}
