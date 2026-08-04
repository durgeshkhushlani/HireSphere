// Interview slots are stored in UTC but must be interpreted/displayed in the
// university's configured timezone everywhere — not each viewer's own
// browser timezone — since an interview happens at the university's
// physical location regardless of who's looking at the schedule.
//
// No date library dependency: computes a zone's UTC offset at a specific
// instant via Intl.DateTimeFormat (handles DST correctly since it reads the
// zone's actual wall-clock at that instant), which is the standard
// dependency-free approach for this.

function offsetMinutesAt(utcMillis: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(new Date(utcMillis)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asUtc - utcMillis) / 60000;
}

/** Stored UTC ISO string -> the "YYYY-MM-DDTHH:mm" a <input type="datetime-local"> expects, as it reads in `timeZone`. */
export function isoToZonedDatetimeLocal(iso: string, timeZone: string): string {
  const utcMillis = new Date(iso).getTime();
  const zoned = new Date(utcMillis + offsetMinutesAt(utcMillis, timeZone) * 60000);
  return zoned.toISOString().slice(0, 16);
}

/** A <input type="datetime-local"> value (wall-clock in `timeZone`) -> a proper UTC ISO string for storage. */
export function zonedDatetimeLocalToIso(datetimeLocalValue: string, timeZone: string): string {
  const naiveUtcMillis = new Date(`${datetimeLocalValue}:00.000Z`).getTime();
  // First pass: offset as if the wall-clock were already UTC — off by the
  // zone's actual offset, so correct once more using that estimate (a
  // second pass isn't needed in practice since offsets don't change within
  // the few minutes this can be off by, except in the rare DST-transition
  // instant itself, an accepted edge case here).
  const offset = offsetMinutesAt(naiveUtcMillis, timeZone);
  return new Date(naiveUtcMillis - offset * 60000).toISOString();
}

/** Stored UTC ISO string -> a human-readable string in `timeZone`, for read-only display. */
export function formatInZone(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });
}
