import type { User } from '../types';

export interface UserListPage {
  label: string;
  users: User[];
}

interface CommonProps {
  pages: UserListPage[];
  pageIndex: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  selectedUserId: string | null;
  onSelectUser: (u: User) => void;
  isDraftGenerated: (userId: string) => boolean;
  onAdd: () => void;
  onRename: () => void;
  onDelete: () => void;
  onRestore: () => void;
}

function UserRow({
  u,
  index,
  selected,
  mark,
  onClick,
}: {
  u: User;
  index?: number;
  selected: boolean;
  mark: boolean;
  onClick: () => void;
}) {
  const label = `${mark ? '✓ ' : ''}${index != null ? `${index + 1}. ` : ''}${u.name}`;
  return (
    <div className={`user-row${selected ? ' user-row-selected' : ''}`} onClick={onClick}>
      {label}
    </div>
  );
}

function UserListPageNav({
  label,
  onPrevPage,
  onNextPage,
}: {
  label: string;
  onPrevPage: () => void;
  onNextPage: () => void;
}) {
  return (
    <div className="user-list-nav">
      <button className="icon-btn-small" onClick={onPrevPage} title="前の表示">‹</button>
      <span className="user-list-nav-label">{label}</span>
      <button className="icon-btn-small" onClick={onNextPage} title="次の表示">›</button>
    </div>
  );
}

function UserListContent({
  page,
  selectedUserId,
  onSelectUser,
  isDraftGenerated,
}: {
  page: UserListPage;
  selectedUserId: string | null;
  onSelectUser: (u: User) => void;
  isDraftGenerated: (userId: string) => boolean;
}) {
  const flat = page.label === 'あいうえお順';
  return (
    <div className="user-list-scroll">
      {page.users.map((u, i) => (
        <UserRow
          key={u.id}
          u={u}
          index={flat ? i : undefined}
          selected={u.id === selectedUserId}
          mark={isDraftGenerated(u.id)}
          onClick={() => onSelectUser(u)}
        />
      ))}
    </div>
  );
}

function ActionButtons({ onAdd, onRename, onDelete, onRestore }: {
  onAdd: () => void; onRename: () => void; onDelete: () => void; onRestore: () => void;
}) {
  return (
    <>
      <button className="btn btn-filled btn-block" onClick={onAdd}>利用者を追加</button>
      <button className="btn btn-outlined btn-block" onClick={onRename}>選択した利用者を編集</button>
      <button className="btn btn-outlined btn-block" onClick={onDelete}>選択した利用者を削除</button>
      <button className="btn btn-outlined btn-block" onClick={onRestore}>削除した利用者一覧</button>
    </>
  );
}

// 画面が広いとき用: 一覧の下にボタンを縦に並べる。
export function UserListPanelWide(props: CommonProps) {
  const page = props.pages[props.pageIndex % props.pages.length];
  return (
    <div className="user-list-panel">
      <div className="user-list-heading">利用者一覧</div>
      <UserListPageNav label={page.label} onPrevPage={props.onPrevPage} onNextPage={props.onNextPage} />
      <div className="user-list-body">
        <UserListContent
          page={page}
          selectedUserId={props.selectedUserId}
          onSelectUser={props.onSelectUser}
          isDraftGenerated={props.isDraftGenerated}
        />
      </div>
      <ActionButtons onAdd={props.onAdd} onRename={props.onRename} onDelete={props.onDelete} onRestore={props.onRestore} />
    </div>
  );
}

// 画面が狭いとき用: ボタンを一覧の下ではなく右側の細い列に並べる。
export function UserListPanelNarrow(props: CommonProps) {
  const page = props.pages[props.pageIndex % props.pages.length];
  return (
    <div className="user-list-panel">
      <div className="user-list-heading">利用者一覧</div>
      <UserListPageNav label={page.label} onPrevPage={props.onPrevPage} onNextPage={props.onNextPage} />
      <div className="user-list-narrow-row">
        <div className="user-list-body user-list-body-narrow">
          <UserListContent
            page={page}
            selectedUserId={props.selectedUserId}
            onSelectUser={props.onSelectUser}
            isDraftGenerated={props.isDraftGenerated}
          />
        </div>
        <div className="user-list-narrow-buttons">
          <ActionButtons onAdd={props.onAdd} onRename={props.onRename} onDelete={props.onDelete} onRestore={props.onRestore} />
        </div>
      </div>
    </div>
  );
}

// スマホ幅用: 縦長の一覧の代わりにプルダウンで利用者を選ぶ。
export function UserSelectorMobile({
  users,
  selectedUserId,
  onSelectUser,
  isDraftGenerated,
  onAdd,
  onRename,
  onDelete,
  onRestore,
}: {
  users: User[];
  selectedUserId: string | null;
  onSelectUser: (u: User) => void;
  isDraftGenerated: (userId: string) => boolean;
  onAdd: () => void;
  onRename: () => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  return (
    <div className="user-selector-mobile">
      <select
        className="user-selector-mobile-select"
        value={selectedUserId ?? ''}
        onChange={(e) => {
          const u = users.find((x) => x.id === e.target.value);
          if (u) onSelectUser(u);
        }}
      >
        <option value="" disabled>利用者を選択</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {isDraftGenerated(u.id) ? '✓ ' : ''}{u.name}
          </option>
        ))}
      </select>
      <button className="icon-btn" title="利用者を追加" onClick={onAdd}>＋</button>
      <details className="overflow-menu">
        <summary className="icon-btn" title="その他の操作">⋮</summary>
        <div className="overflow-menu-list">
          <button onClick={onRename}>選択した利用者を編集</button>
          <button onClick={onDelete}>選択した利用者を削除</button>
          <button onClick={onRestore}>削除した利用者一覧</button>
        </div>
      </details>
    </div>
  );
}
