import type { RetentionConfig } from "../types/config.js";
import type { ArtifactMeta } from "../types/driver.js";
import type { PruneResult } from "../types/result.js";

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function weekKey(iso: string): string {
  const d = new Date(iso);
  const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function yearKey(iso: string): string {
  return iso.slice(0, 4);
}

export class RetentionManager {
  selectDeletions(artifacts: ArtifactMeta[], retention?: RetentionConfig): PruneResult {
    if (!retention) {
      return { deleted: [], kept: artifacts.map((a) => a.key) };
    }

    const sorted = [...artifacts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const hasKeepRules = Boolean(
      retention.keepLast ||
        retention.keepDaily ||
        retention.keepWeekly ||
        retention.keepMonthly ||
        retention.keepYearly,
    );

    const keep = new Set<string>();

    if (retention.keepLast) {
      for (const a of sorted.slice(0, retention.keepLast)) keep.add(a.key);
    }

    const takeBuckets = (keyFn: (iso: string) => string, limit?: number) => {
      if (!limit) return;
      const seen = new Set<string>();
      for (const a of sorted) {
        const k = keyFn(a.createdAt);
        if (seen.has(k)) continue;
        seen.add(k);
        keep.add(a.key);
        if (seen.size >= limit) break;
      }
    };

    takeBuckets(dayKey, retention.keepDaily);
    takeBuckets(weekKey, retention.keepWeekly);
    takeBuckets(monthKey, retention.keepMonthly);
    takeBuckets(yearKey, retention.keepYearly);

    const now = Date.now();
    const deleted: string[] = [];
    const kept: string[] = [];

    for (const a of sorted) {
      const ageDays = (now - new Date(a.createdAt).getTime()) / 86400000;
      const tooOld = retention.maxAgeDays !== undefined && ageDays > retention.maxAgeDays;
      if (tooOld) {
        deleted.push(a.key);
        continue;
      }
      if (!hasKeepRules || keep.has(a.key)) {
        kept.push(a.key);
      } else {
        deleted.push(a.key);
      }
    }

    return { deleted, kept };
  }
}
