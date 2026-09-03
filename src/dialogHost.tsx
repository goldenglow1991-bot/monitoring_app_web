import { useEffect, useState, type ReactNode } from 'react';

// Flutterの `await showDialog<T>()` に相当する、Promiseベースのモーダル表示の仕組み。
// openDialog(render) を呼ぶと、render(close) が返すJSXがオーバーレイとして
// 積み上がり、close(value) が呼ばれるまでPromiseは解決しない。

interface Entry {
  id: number;
  node: ReactNode;
}

let idCounter = 0;
let entries: Entry[] = [];
let listeners: Array<(entries: Entry[]) => void> = [];

function notify() {
  for (const l of listeners) l(entries);
}

export function openDialog<T>(render: (close: (value: T) => void) => ReactNode): Promise<T> {
  return new Promise((resolve) => {
    const id = idCounter++;
    const close = (value: T) => {
      entries = entries.filter((e) => e.id !== id);
      notify();
      resolve(value);
    };
    entries = [...entries, { id, node: render(close) }];
    notify();
  });
}

// ログアウト・ユーザー切り替え・ホーム画面からの離脱時に呼ぶ。開いたまま放置された
// ダイアログが、共有端末での次の利用者に(前の利用者のデータのまま)表示され続けたり、
// 古いクロージャで別の利用者の記録に書き込まれたりするのを防ぐ。
// (呼び出し元のPromiseはresolveされないまま残るが、close()未呼び出しのままの
// 破棄は元々openDialog利用側で想定されている挙動であり、問題ない。)
export function closeAllDialogs() {
  entries = [];
  notify();
}

export function DialogHost() {
  const [list, setList] = useState<Entry[]>(entries);
  useEffect(() => {
    listeners.push(setList);
    return () => {
      listeners = listeners.filter((l) => l !== setList);
    };
  }, []);
  return (
    <>
      {list.map((e) => (
        <div key={e.id}>{e.node}</div>
      ))}
    </>
  );
}

// ---- 汎用モーダルの外枠(オーバーレイ+中央寄せカード) ----
export function ModalShell({
  children,
  width = 420,
  onBackdropClick,
  topAligned,
}: {
  children: ReactNode;
  width?: number;
  onBackdropClick?: () => void;
  // スマホ幅では、キーボードが開いた際に画面中央寄せだと入力欄が隠れて
  // しまいやすいため、上寄りに表示したいダイアログ(留意点・所見の
  // 自由記入欄など)向けのオプション。デスクトップ・タブレット幅では
  // 見た目を変えない。
  topAligned?: boolean;
}) {
  return (
    <div
      className={`modal-overlay${topAligned ? ' modal-overlay-top-aligned' : ''}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onBackdropClick?.();
      }}
    >
      <div className="modal-card" style={{ width, maxWidth: '100%' }}>
        {children}
      </div>
    </div>
  );
}
