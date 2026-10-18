# Retention

Retention policies decide which artifacts to keep when pruning.

## Fields

| Field | Meaning |
| --- | --- |
| `keepLast` | Keep the N most recent artifacts |
| `keepDaily` | Keep one per day for N days |
| `keepWeekly` | Keep one per week for N weeks |
| `keepMonthly` | Keep one per month for N months |
| `keepYearly` | Keep one per year for N years |
| `maxAgeDays` | Delete anything older than N days |

Rules are combined: an artifact is kept if **any** keep-* rule matches, then `maxAgeDays` may still delete it.

## Example

```json
{
  "retention": {
    "keepLast": 3,
    "keepDaily": 7,
    "keepWeekly": 4,
    "keepMonthly": 6,
    "maxAgeDays": 365
  }
}
```

## Prune

```bash
backup-kit prune
```

Prune emits `prune:start` / `prune:complete` events (see [`spec/events.md`](../spec/events.md)).
