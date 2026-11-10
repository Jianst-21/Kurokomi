const MONTH_MAP: Record<string, number> = {
  januari: 0,
  jan: 0,
  februari: 1,
  feb: 1,
  maret: 2,
  mar: 2,
  april: 3,
  apr: 3,
  mei: 4,
  may: 4,
  juni: 5,
  jun: 5,
  juli: 6,
  jul: 6,
  agustus: 7,
  agt: 7,
  aug: 7,
  september: 8,
  sep: 8,
  oktober: 9,
  okt: 9,
  oct: 9,
  november: 10,
  nov: 10,
  desember: 11,
  des: 11,
  dec: 11,
};

function padZero(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatChapterDate(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const cleanStr = dateStr.trim();
  if (!cleanStr) return '';

  // 1. Try parsing relative date, e.g. "5 hari lalu", "2 jam lalu", "3 minggu lalu", "1 tahun lalu"
  const relMatch = cleanStr.match(/^(\d+)\s+(detik|menit|jam|hari|minggu|bulan|tahun)\s+(yang\s+)?lalu/i);
  if (relMatch) {
    const num = parseInt(relMatch[1], 10);
    const unit = relMatch[2].toLowerCase();
    const d = new Date();

    if (unit === 'detik') d.setSeconds(d.getSeconds() - num);
    else if (unit === 'menit') d.setMinutes(d.getMinutes() - num);
    else if (unit === 'jam') d.setHours(d.getHours() - num);
    else if (unit === 'hari') d.setDate(d.getDate() - num);
    else if (unit === 'minggu') d.setDate(d.getDate() - num * 7);
    else if (unit === 'bulan') d.setMonth(d.getMonth() - num);
    else if (unit === 'tahun') d.setFullYear(d.getFullYear() - num);

    return `${padZero(d.getDate())}/${padZero(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  // 2. Try parsing DD/MM/YYYY
  const dmyMatch = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return `${padZero(day)}/${padZero(month)}/${year}`;
    }
  }

  // 3. Try parsing Indonesian format: "25 Oktober 2026" or "25 Okt 2026"
  const indoMatch = cleanStr.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
  if (indoMatch) {
    const day = parseInt(indoMatch[1], 10);
    const monthName = indoMatch[2].toLowerCase();
    const year = parseInt(indoMatch[3], 10);

    if (MONTH_MAP[monthName] !== undefined && !isNaN(day) && !isNaN(year)) {
      return `${padZero(day)}/${padZero(MONTH_MAP[monthName] + 1)}/${year}`;
    }
  }

  // 4. Try parsing ISO or standard Date
  const parsed = new Date(cleanStr);
  if (!isNaN(parsed.getTime())) {
    // If original string has a plain YYYY-MM-DD, parse as UTC/local to avoid timezone shifts
    const ymdMatch = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      return `${ymdMatch[3]}/${ymdMatch[2]}/${ymdMatch[1]}`;
    }
    return `${padZero(parsed.getDate())}/${padZero(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
  }

  return '';
}

export function formatRelativeTime(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const cleanStr = dateStr.trim();
  if (!cleanStr) return '';

  // 1. Immediate match for "Baru saja" or "0 jam/menit/detik lalu"
  if (/^0\s+(jam|menit|detik)\s+(yang\s+)?lalu/i.test(cleanStr) || cleanStr.toLowerCase() === 'baru saja') {
    return 'Baru saja';
  }

  // 2. Relative dates in Indonesian e.g. "15 menit lalu", "2 jam lalu", "3 hari lalu"
  const relMatch = cleanStr.match(/^(\d+)\s+(detik|menit|jam|hari|minggu|bulan|tahun)\s+(yang\s+)?lalu/i);
  if (relMatch) {
    const num = parseInt(relMatch[1], 10);
    const unit = relMatch[2].toLowerCase();
    if (unit === 'detik' || (unit === 'jam' && num === 0) || (unit === 'menit' && num === 0)) {
      return 'Baru saja';
    }
    return cleanStr;
  }

  // 3. Relative dates in English e.g. "15 minutes ago", "2 hours ago"
  const enRelMatch = cleanStr.match(/^(\d+)\s+(sec|second|seconds|min|minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)\s+ago/i);
  if (enRelMatch) {
    const num = parseInt(enRelMatch[1], 10);
    const unit = enRelMatch[2].toLowerCase();
    if (unit.startsWith('sec') || (unit.startsWith('hour') && num === 0) || (unit.startsWith('min') && num === 0)) {
      return 'Baru saja';
    }
    if (unit.startsWith('min')) return `${num} menit lalu`;
    if (unit.startsWith('hour')) return `${num} jam lalu`;
    if (unit.startsWith('day')) return `${num} hari lalu`;
    if (unit.startsWith('week')) return `${num} minggu lalu`;
    if (unit.startsWith('month')) return `${num} bulan lalu`;
    if (unit.startsWith('year')) return `${num} tahun lalu`;
  }

  // 4. Try parsing ISO string, timestamp or date string
  const parsed = new Date(cleanStr);
  if (!isNaN(parsed.getTime())) {
    const now = Date.now();
    const diffSec = Math.floor((now - parsed.getTime()) / 1000);

    // If future or under 60 seconds ago
    if (diffSec < 60) {
      return 'Baru saja';
    }
    // Under 1 hour ago -> use minutes!
    if (diffSec < 3600) {
      const diffMin = Math.max(1, Math.floor(diffSec / 60));
      return `${diffMin} menit lalu`;
    }
    // Under 24 hours ago -> use hours
    if (diffSec < 86400) {
      const diffHour = Math.floor(diffSec / 3600);
      return `${diffHour} jam lalu`;
    }
    // Under 7 days ago -> use days
    if (diffSec < 86400 * 7) {
      const diffDay = Math.floor(diffSec / 86400);
      return `${diffDay} hari lalu`;
    }

    // Older than 7 days -> fallback to formatted date DD/MM/YYYY
    return formatChapterDate(cleanStr);
  }

  // 5. Fallback to formatChapterDate
  return formatChapterDate(cleanStr) || cleanStr;
}

export function parseDateScore(dateStr?: string): number {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  const cleanStr = dateStr.trim();
  if (!cleanStr) return 0;

  // 0. "Baru saja" or "0 jam/menit/detik lalu"
  if (cleanStr.toLowerCase() === 'baru saja' || /^0\s+(jam|menit|detik)\s+(yang\s+)?lalu/i.test(cleanStr)) {
    return Date.now();
  }

  // 1. Relative dates
  const rel = cleanStr.match(/^(\d+)\s+(detik|menit|jam|hari|minggu|bulan|tahun)\s+(yang\s+)?lalu/i);
  if (rel) {
    const num = parseInt(rel[1], 10);
    const unit = rel[2].toLowerCase();
    const now = Date.now();
    let ms = 0;
    if (unit === 'detik') ms = num * 1000;
    else if (unit === 'menit') ms = num * 60 * 1000;
    else if (unit === 'jam') ms = num * 3600 * 1000;
    else if (unit === 'hari') ms = num * 86400 * 1000;
    else if (unit === 'minggu') ms = num * 7 * 86400 * 1000;
    else if (unit === 'bulan') ms = num * 30 * 86400 * 1000;
    else if (unit === 'tahun') ms = num * 365 * 86400 * 1000;
    return now - ms;
  }

  // 1b. Relative dates in English
  const enRel = cleanStr.match(/^(\d+)\s+(sec|second|seconds|min|minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)\s+ago/i);
  if (enRel) {
    const num = parseInt(enRel[1], 10);
    const unit = enRel[2].toLowerCase();
    const now = Date.now();
    let ms = 0;
    if (unit.startsWith('sec')) ms = num * 1000;
    else if (unit.startsWith('min')) ms = num * 60 * 1000;
    else if (unit.startsWith('hour')) ms = num * 3600 * 1000;
    else if (unit.startsWith('day')) ms = num * 86400 * 1000;
    else if (unit.startsWith('week')) ms = num * 7 * 86400 * 1000;
    else if (unit.startsWith('month')) ms = num * 30 * 86400 * 1000;
    else if (unit.startsWith('year')) ms = num * 365 * 86400 * 1000;
    return now - ms;
  }

  // 2. DD/MM/YYYY
  const dmyMatch = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const d = new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10));
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 3. Indonesian text date e.g. "25 Oktober 2026"
  const indoMatch = cleanStr.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
  if (indoMatch) {
    const day = parseInt(indoMatch[1], 10);
    const monthName = indoMatch[2].toLowerCase();
    const year = parseInt(indoMatch[3], 10);
    if (MONTH_MAP[monthName] !== undefined && !isNaN(day) && !isNaN(year)) {
      return new Date(year, MONTH_MAP[monthName], day).getTime();
    }
  }

  // 4. ISO or standard Date
  const parsed = new Date(cleanStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.getTime();
  }

  return 0;
}
