export interface User {
  id: string;
  name: string;
  furigana: string;
  precautions: string;
}

export interface DeletedUser extends User {
  deletedAt: string;
}

export interface ItemValue {
  status: string;
  free: string;
}

export interface MonthlyRecord {
  yearMonth: string;
  notes: string;
  items: Record<string, ItemValue>;
  extraNotes: string;
  report: string;
  draft: string;
  draftGenerated: boolean;
  // Supabase上の行を読み込んだ時に入る、同時編集検知(楽観的ロック)用の情報。
  // ローカルで新規作成しただけでまだ一度も保存していない場合はundefined。
  updatedAt?: string;
}

export function newMonthlyRecord(partial: Partial<MonthlyRecord> & { yearMonth: string }): MonthlyRecord {
  return {
    yearMonth: partial.yearMonth,
    notes: partial.notes ?? '',
    items: partial.items ?? {},
    extraNotes: partial.extraNotes ?? '',
    report: partial.report ?? '',
    draft: partial.draft ?? '',
    draftGenerated: partial.draftGenerated ?? false,
    updatedAt: partial.updatedAt,
  };
}
