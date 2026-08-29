import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';
import type { ItemDef } from '../items';

export function ItemRow({
  item,
  labelWidth,
  status,
  free,
  onStatusChange,
  onFreeChange,
}: {
  item: ItemDef;
  labelWidth: number;
  status: string;
  free: string;
  onStatusChange: (key: string, value: string) => void;
  onFreeChange: (key: string, value: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
      <input
        className="item-free-input"
        value={free}
        onChange={(e) => onFreeChange(item.key, e.target.value)}
      />
    </div>
  );
}
