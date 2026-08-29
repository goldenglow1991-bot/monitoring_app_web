import { UNSET, type ItemDef } from './items';
import type { ItemValue, MonthlyRecord } from './types';

/// [orderedItems]には、現在有効な項目を設定画面での表示順に並べたリストを渡す。
export function compileNotes(
  orderedItems: ItemDef[],
  itemValues: Record<string, ItemValue>,
  extraNotes: string,
): string {
  const lines: string[] = [];
  for (const item of orderedItems) {
    const value = itemValues[item.key];
    const status = (value?.status ?? '').trim();
    const free = (value?.free ?? '').trim();
    if (free === '' && (status === '' || status === UNSET)) continue;
    if (status !== '' && status !== UNSET && free !== '') {
      lines.push(`・${item.label}: ${status}(${free})`);
    } else if (status !== '' && status !== UNSET) {
      lines.push(`・${item.label}: ${status}`);
    } else {
      lines.push(`・${item.label}: ${free}`);
    }
  }
  const extra = extraNotes.trim();
  if (extra !== '') {
    lines.push(`\n【その他メモ】\n${extra}`);
  }
  return lines.join('\n');
}

export function pastRecordsText(
  records: MonthlyRecord[],
  targetYearMonth: string,
  maxCount = 3,
): string {
  const past = records
    .filter((r) => r.yearMonth < targetYearMonth && r.report !== '')
    .sort((a, b) => (a.yearMonth < b.yearMonth ? -1 : a.yearMonth > b.yearMonth ? 1 : 0));
  const tail = past.length > maxCount ? past.slice(past.length - maxCount) : past;
  if (tail.length === 0) return '(過去の記録なし)';
  return tail.map((r) => `[${r.yearMonth}]\n${r.report}`).join('\n\n');
}

// 個人情報保護の観点から、利用者の実名はAI(外部API)には送らない。
// AI側もsystemPromptで名前を使った書き出しをしないよう指示済みなので、
// 実名が無くても文章生成には支障がない。
export function buildUserPrompt(params: {
  precautions: string;
  pastText: string;
  targetYearMonth: string;
  notes: string;
}): string {
  const precautionsTrimmed = params.precautions.trim();
  const precautionsBlock = precautionsTrimmed !== '' ? `【留意点】\n${precautionsTrimmed}\n\n` : '';
  return (
    `${precautionsBlock}` +
    `【過去の記録】\n${params.pastText}\n\n` +
    `【今月(${params.targetYearMonth})の所見】\n${params.notes}\n\n` +
    '上記をもとに、ケアマネージャーに提出する月次モニタリング報告の本文を作成してください。'
  );
}
