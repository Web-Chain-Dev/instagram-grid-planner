import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { IgPost } from "@/lib/ig-types";
import { CarouselBadge, PinBadge, ReelBadge } from "./icons";

type Props = {
  posts: IgPost[];
  gap: number;
  aspect: string;
  editable?: boolean | undefined;
  onTileClick?: ((post: IgPost) => void) | undefined;
  onReorder?: ((ids: string[]) => void) | undefined;
  onInvalidMove?: (() => void) | undefined;
  showPins?: boolean | undefined;
};

export function IgGrid({ posts, gap, aspect, editable, onTileClick, onReorder, onInvalidMove, showPins = true }: Props) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const handleEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = posts.findIndex((p) => p.id === active.id);
    const to = posts.findIndex((p) => p.id === over.id);
    if (posts[from]?.pinned !== posts[to]?.pinned) {
      onInvalidMove?.();
      return;
    }
    onReorder?.(arrayMove(posts, from, to).map((p) => p.id));
  };

  const grid = (
    <div className="grid grid-cols-3" style={{ gap }}>
      {posts.map((p) => (
        <Tile
          key={p.id}
          post={p}
          aspect={aspect}
          editable={editable}
          onClick={() => onTileClick?.(p)}
          showPin={showPins}
        />
      ))}
    </div>
  );

  if (!editable) return grid;
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEnd}>
      <SortableContext items={posts.map((p) => p.id)} strategy={rectSortingStrategy}>
        {grid}
      </SortableContext>
    </DndContext>
  );
}

function Tile({
  post,
  aspect,
  editable,
  onClick,
  showPin,
}: {
  post: IgPost;
  aspect: string;
  editable?: boolean | undefined;
  onClick: () => void;
  showPin: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: post.id,
    disabled: !editable,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    aspectRatio: aspect,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };
  const videoOnly = !post.coverSrc && post.kind === "reel" ? post.mediaSrcs[0] : null;

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      onClick={onClick}
      className="relative block w-full touch-manipulation select-none overflow-hidden bg-ig-placeholder outline-none"
      {...attributes}
      {...listeners}
    >
      {post.coverSrc ? (
        <img src={post.coverSrc} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      ) : videoOnly ? (
        <video src={videoOnly} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <span className="pointer-events-none absolute right-[6px] top-[6px] flex gap-1 text-ig-bg ig-badge">
        {showPin && post.pinned ? (
          <PinBadge size={18} />
        ) : post.kind === "reel" ? (
          <ReelBadge size={18} />
        ) : post.kind === "carousel" ? (
          <CarouselBadge size={20} />
        ) : null}
      </span>
    </button>
  );
}
