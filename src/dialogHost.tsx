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
}: {
  children: ReactNode;
  width?: number;
  onBackdropClick?: () => void;
}) {
  return (
    <div className="modal-overlay" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onBackdropClick?.();
    }}>
      <div className="modal-card" style={{ width }}>
        {children}
      </div>
    </div>
  );
}
