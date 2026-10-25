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

  // 2. Try parsing Indonesian format: "25 Oktober 2026" or "25 Okt 2026"
  const indoMatch = cleanStr.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
  if (indoMatch) {
    const day = parseInt(indoMatch[1], 10);
    const monthName = indoMatch[2].toLowerCase();
    const year = parseInt(indoMatch[3], 10);

    if (MONTH_MAP[monthName] !== undefined && !isNaN(day) && !isNaN(year)) {
      return `${padZero(day)}/${padZero(MONTH_MAP[monthName] + 1)}/${year}`;
    }
  }

  // 3. Try parsing ISO or standard Date
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
