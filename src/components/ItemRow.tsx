import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';
import type { ItemDef } from '../items';
import { showTextEditDialog } from '../dialogs';

export function ItemRow({
  item,
  labelWidth,
  status,
  free,
  mobile,
  onStatusChange,
  onFreeChange,
}: {
  item: ItemDef;
  labelWidth: number;
  status: string;
  free: string;
  mobile?: boolean;
  onStatusChange: (key: string, value: string) => void;
  onFreeChange: (key: string, value: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  async function openFreeTextEditor() {
    const result = await showTextEditDialog(item.label, free);
    if (result != null) onFreeChange(item.key, result);
  }

  return (
    <div className={`item-row${isDragging ? ' item-row-dragging' : ''}`} ref={setNodeRef} style={style}>
      <span className="drag-handle" {...attributes} {...listeners} title="ドラッグで並び替え">
        ☰
      </span>
      <span className="item-label" style={{ width: labelWidth }}>{item.label}</span>
      <select
        className="item-status-select"
        value={status}
        onChange={(e) => onStatusChange(item.key, e.target.value)}
      >
        {item.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {mobile ? (
        <input className="item-free-input" value={free} readOnly onClick={openFreeTextEditor} />
      ) : (
        <input
          className="item-free-input"
          value={free}
          onChange={(e) => onFreeChange(item.key, e.target.value)}
        />
      )}
    </div>
  );
}
