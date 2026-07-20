/*
  Some imported POI descriptions were decoded as UTF-8 more than once before
  reaching the API. I repair only strings containing known encoding markers,
  leaving normal text, URLs and user-entered content unchanged.
*/

const WINDOWS_1252_BYTES: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

const ENCODING_MARKERS = /(?:Ã|Â|â|ðŸ|ï¿½|\uFFFD)/g;

function markerCount(value: string): number {
  return value.match(ENCODING_MARKERS)?.length ?? 0;
}

function decodeWindows1252AsUtf8(value: string): string | null {
  const bytes: number[] = [];

  for (const character of value) {
    const codePoint = character.codePointAt(0);

    if (codePoint === undefined) {
      continue;
    }

    if (codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }

    const mappedByte = WINDOWS_1252_BYTES[codePoint];

    if (mappedByte === undefined) {
      return null;
    }

    bytes.push(mappedByte);
  }

  return new TextDecoder("utf-8", { fatal: true }).decode(
    new Uint8Array(bytes)
  );
}

export function repairDisplayText(value: string): string {
  let repaired = value;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const currentMarkerCount = markerCount(repaired);

    if (currentMarkerCount === 0) {
      break;
    }

    try {
      const decoded = decodeWindows1252AsUtf8(repaired);

      if (
        decoded === null ||
        markerCount(decoded) >= currentMarkerCount
      ) {
        break;
      }

      repaired = decoded;
    } catch {
      break;
    }
  }

  return repaired;
}

/*
  API responses can contain text at several nested levels. This creates a
  display-safe copy without changing backend or database records.
*/
export function repairApiText<T>(value: T): T {
  if (typeof value === "string") {
    return repairDisplayText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => repairApiText(item)) as T;
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        repairApiText(item),
      ])
    ) as T;
  }

  return value;
}
