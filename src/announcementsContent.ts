// アプリ内の「お知らせ」一覧。新しいお知らせを追加する時は、配列の
// 先頭に追加してください(表示は配列の順番のまま、上から新着になります)。
//
// idは既読管理(ブラウザのlocalStorage)に使います。一度公開したお知らせの
// idは変更しないでください(変更すると、既読済みの人にも未読として
// 再表示されてしまいます)。

export interface Announcement {
  id: string;
  date: string;
  title: string;
  body: string;
}

export const announcements: Announcement[] = [];
