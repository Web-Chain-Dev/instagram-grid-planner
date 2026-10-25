import { useState } from "react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { IgHighlight, IgPost, IgProfile } from "@/lib/ig-types";
import { orderGrid } from "@/lib/ig-types";
import { IgGrid } from "./IgGrid";
import {
  AddPerson,
  ChevronDown,
  GridIcon,
  Hamburger,
  HomeIcon,
  LinkIcon,
  PlusSquare,
  PlusThin,
  ReelsIcon,
  SearchIcon,
  SendIcon,
  SettingsGear,
  TaggedIcon,
  ThreadsIcon,
  VerifiedBadge,
} from "./icons";

export type IgViewHandlers = {
  editable?: boolean | undefined;
  onTileClick?: ((p: IgPost) => void) | undefined;
  onReorder?: ((ids: string[]) => void) | undefined;
  onInvalidMove?: (() => void) | undefined;
  onHighlightClick?: ((h: IgHighlight) => void) | undefined;
  onAddHighlight?: (() => void) | undefined;
  onReorderHighlights?: ((ids: string[]) => void) | undefined;
  onEditProfile?: (() => void) | undefined;
};

type Props = IgViewHandlers & {
  profile: IgProfile;
  posts: IgPost[];
  highlights: IgHighlight[];
  layout: "mobile" | "desktop";
};

type Tab = "grid" | "reels" | "tagged";

export function IgProfileView(props: Props) {
  return props.layout === "mobile" ? <Mobile {...props} /> : <Desktop {...props} />;
}

function Avatar({ src, size }: { src: string | null; size: number }) {
  return (
    <div className="shrink-0 overflow-hidden rounded-full bg-ig-placeholder" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <svg viewBox="0 0 24 24" className="h-full w-full text-ig-border" fill="currentColor">
          <rect width="24" height="24" className="text-ig-placeholder" fill="currentColor" />
          <circle cx="12" cy="9.5" r="4" />
          <path d="M4 22c0-4.4 3.6-7 8-7s8 2.6 8 7Z" />
        </svg>
      )}
    </div>
  );
}

function Bio({ profile, size }: { profile: IgProfile; size: number }) {
  return (
    <div style={{ fontSize: size, lineHeight: 1.33 }}>
      {profile.full_name && <div className="font-semibold">{profile.full_name}</div>}
      {profile.category && <div className="text-ig-secondary">{profile.category}</div>}
      {profile.bio && <div className="whitespace-pre-line break-words">{profile.bio}</div>}
      {profile.link && (
        <div className="flex items-center gap-1 font-semibold text-ig-link">
          <LinkIcon size={size - 2} />
          <span className="truncate">{profile.link.replace(/^https?:\/\//, "")}</span>
        </div>
      )}
    </div>
  );
}

function useTabPosts(posts: IgPost[], tab: Tab) {
  const grid = orderGrid(posts);
  if (tab === "reels") return [...posts].filter((p) => p.kind === "reel").sort((a, b) => a.position - b.position);
  if (tab === "tagged") return [];
  return grid;
}

function Highlights({
  highlights,
  size,
  editable,
  onHighlightClick,
  onAddHighlight,
  onReorderHighlights,
  fontSize,
  gap,
}: Props & { size: number; fontSize: number; gap: number }) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
  );
  const onEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = highlights.findIndex((h) => h.id === e.active.id);
    const to = highlights.findIndex((h) => h.id === e.over!.id);
    onReorderHighlights?.(arrayMove(highlights, from, to).map((h) => h.id));
  };
  if (!editable && highlights.length === 0) return null;
  return (
    <div className="no-scrollbar flex overflow-x-auto" style={{ gap }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onEnd}>
        <SortableContext items={highlights.map((h) => h.id)} strategy={horizontalListSortingStrategy}>
          {highlights.map((h) => (
            <HighlightBubble
              key={h.id}
              h={h}
              size={size}
              fontSize={fontSize}
              editable={editable}
              onClick={() => onHighlightClick?.(h)}
            />
          ))}
        </SortableContext>
      </DndContext>
      {editable && (
        <button type="button" onClick={onAddHighlight} className="flex shrink-0 flex-col items-center" style={{ width: size + 8 }}>
          <span
            className="flex items-center justify-center rounded-full border border-ig-border"
            style={{ width: size, height: size }}
          >
            <PlusThin size={size * 0.45} />
          </span>
          <span className="mt-1 w-full truncate text-center" style={{ fontSize }}>
            New
          </span>
        </button>
      )}
    </div>
  );
}

function HighlightBubble({
  h,
  size,
  fontSize,
  editable,
  onClick,
}: {
  h: IgHighlight;
  size: number;
  fontSize: number;
  editable?: boolean | undefined;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: h.id, disabled: !editable });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      style={{ transform: CSS.Transform.toString(transform), transition, width: size + 8 }}
      className="flex shrink-0 touch-manipulation select-none flex-col items-center"
      {...attributes}
      {...listeners}
    >
      <span
        className="flex items-center justify-center rounded-full border border-ig-border p-[3px]"
        style={{ width: size, height: size }}
      >
        <span className="block h-full w-full overflow-hidden rounded-full bg-ig-placeholder">
          {h.coverSrc && <img src={h.coverSrc} alt="" draggable={false} className="h-full w-full object-cover" />}
        </span>
      </span>
      <span className="mt-1 w-full truncate text-center" style={{ fontSize }}>
        {h.title}
      </span>
    </button>
  );
}

function EmptyGrid({ tab, editable }: { tab: Tab; editable?: boolean | undefined }) {
  const label = tab === "tagged" ? "Photos and videos of you" : tab === "reels" ? "Share a moment with the world" : "Share photos";
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full border-2 border-ig-text">
        {tab === "tagged" ? <TaggedIcon size={30} /> : tab === "reels" ? <ReelsIcon size={30} /> : <GridIcon size={30} />}
      </div>
      <div className="mt-4 text-[24px] font-extrabold leading-tight">{label}</div>
      <div className="mt-2 text-[14px] text-ig-secondary">
        {tab === "tagged"
          ? "When people tag you in photos and videos, they'll appear here."
          : editable
            ? "Use “Add” to upload photos, carousels and reels."
            : "When you share photos, they will appear on your profile."}
      </div>
    </div>
  );
}

function Mobile(props: Props) {
  const { profile, posts, editable, onEditProfile } = props;
  const [tab, setTab] = useState<Tab>("grid");
  const shown = useTabPosts(posts, tab);
  const postCount = profile.posts_count_override?.trim() || String(posts.length);

  return (
    <div className="ig-root flex h-full flex-col text-[14px]">
      {/* top bar */}
      <div className="flex h-[44px] shrink-0 items-center justify-between px-4">
        <PlusSquare size={24} />
        <div className="flex items-center gap-1 text-[20px] font-bold">
          <span className="max-w-[180px] truncate">{profile.username}</span>
          {profile.is_verified && <VerifiedBadge size={16} />}
          <ChevronDown size={12} />
        </div>
        <div className="flex items-center gap-5">
          <ThreadsIcon size={22} />
          <Hamburger size={24} />
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto">
        {/* header */}
        <div className="flex items-center gap-5 px-4 pt-2">
          <button type="button" onClick={onEditProfile} className="relative">
            <Avatar src={profile.avatarSrc} size={86} />
          </button>
          <div className="flex-1">
            <div className="mb-1 text-[15px] font-semibold">{profile.full_name || profile.username}</div>
            <div className="flex justify-between pr-2">
              {[
                [postCount, "posts"],
                [profile.followers, "followers"],
                [profile.following, "following"],
              ].map(([n, l]) => (
                <div key={l} className="flex flex-col leading-tight">
                  <span className="text-[16px] font-semibold">{n}</span>
                  <span className="text-[14px]">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 pt-3">
          <Bio profile={{ ...profile, full_name: "" }} size={14} />
        </div>

        <div className="flex gap-[6px] px-4 pt-3">
          <button type="button" onClick={onEditProfile} className="h-[32px] flex-1 rounded-[8px] bg-ig-btn text-[14px] font-semibold">
            Edit profile
          </button>
          <button type="button" className="h-[32px] flex-1 rounded-[8px] bg-ig-btn text-[14px] font-semibold">
            Share profile
          </button>
          <button type="button" className="flex h-[32px] w-[34px] items-center justify-center rounded-[8px] bg-ig-btn">
            <AddPerson size={16} />
          </button>
        </div>

        <div className="px-4 pt-4">
          <Highlights {...props} size={64} fontSize={12} gap={14} />
        </div>

        {/* tabs */}
        <div className="mt-3 flex border-b border-ig-border">
          {(
            [
              ["grid", GridIcon],
              ["reels", ReelsIcon],
              ["tagged", TaggedIcon],
            ] as const
          ).map(([t, Icon]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex h-[44px] flex-1 items-center justify-center border-b ${
                tab === t ? "border-ig-text text-ig-text" : "border-transparent text-ig-secondary"
              }`}
            >
              <Icon size={24} />
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <EmptyGrid tab={tab} editable={editable} />
        ) : (
          <div className="pt-[2px]">
            <IgGrid
              posts={shown}
              gap={2}
              aspect={tab === "reels" ? "9 / 16" : "3 / 4"}
              editable={editable && tab === "grid"}
              onTileClick={props.onTileClick}
              onReorder={props.onReorder}
              onInvalidMove={props.onInvalidMove}
              showPins={tab === "grid"}
            />
          </div>
        )}
      </div>

      {/* bottom nav */}
      <div className="flex h-[50px] shrink-0 items-center justify-around border-t border-ig-border bg-ig-bg">
        <HomeIcon size={24} />
        <SearchIcon size={24} />
        <PlusSquare size={24} />
        <ReelsIcon size={24} />
        <div className="rounded-full ring-2 ring-ig-text ring-offset-1 ring-offset-ig-bg">
          <Avatar src={profile.avatarSrc} size={24} />
        </div>
      </div>
    </div>
  );
}

function Desktop(props: Props) {
  const { profile, posts, editable, onEditProfile } = props;
  const [tab, setTab] = useState<Tab>("grid");
  const shown = useTabPosts(posts, tab);
  const postCount = profile.posts_count_override?.trim() || String(posts.length);

  return (
    <div className="ig-root min-h-full text-[14px]">
      <div className="mx-auto max-w-[935px] px-5 pt-[30px]">
        <header className="mb-11 flex items-start">
          <div className="mr-[30px] flex flex-[0_0_33%] justify-center">
            <button type="button" onClick={onEditProfile}>
              <Avatar src={profile.avatarSrc} size={150} />
            </button>
          </div>
          <section className="flex-1">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <h2 className="mr-3 flex items-center gap-1 text-[20px] font-normal">
                {profile.username}
                {profile.is_verified && <VerifiedBadge size={18} />}
              </h2>
              <button type="button" onClick={onEditProfile} className="h-[32px] rounded-[8px] bg-ig-btn px-4 text-[14px] font-semibold">
                Edit profile
              </button>
              <button type="button" className="h-[32px] rounded-[8px] bg-ig-btn px-4 text-[14px] font-semibold">
                View archive
              </button>
              <SettingsGear size={24} className="ml-1" />
            </div>
            <ul className="mb-5 flex gap-10 text-[16px]">
              <li>
                <span className="font-semibold">{postCount}</span> posts
              </li>
              <li>
                <span className="font-semibold">{profile.followers}</span> followers
              </li>
              <li>
                <span className="font-semibold">{profile.following}</span> following
              </li>
            </ul>
            <Bio profile={profile} size={14} />
          </section>
        </header>

        <div className="mb-11 px-4">
          <Highlights {...props} size={87} fontSize={12} gap={40} />
        </div>

        <div className="flex justify-center gap-[60px] border-t border-ig-border">
          {(
            [
              ["grid", GridIcon, "POSTS"],
              ["reels", ReelsIcon, "REELS"],
              ["tagged", TaggedIcon, "TAGGED"],
            ] as const
          ).map(([t, Icon, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mt-px flex h-[52px] items-center gap-[6px] border-t text-[12px] font-semibold tracking-[1px] ${
                tab === t ? "border-ig-text text-ig-text" : "border-transparent text-ig-secondary"
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <EmptyGrid tab={tab} editable={editable} />
        ) : (
          <div className="pb-10">
            <IgGrid
              posts={shown}
              gap={4}
              aspect={tab === "reels" ? "9 / 16" : "3 / 4"}
              editable={editable && tab === "grid"}
              onTileClick={props.onTileClick}
              onReorder={props.onReorder}
              onInvalidMove={props.onInvalidMove}
              showPins={tab === "grid"}
            />
          </div>
        )}
      </div>
      <div className="hidden">
        <SendIcon />
      </div>
    </div>
  );
}
