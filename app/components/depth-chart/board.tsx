import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { User } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { DepthChart, Player, PlayerGroup } from "~/types";
import {
  calculateAgeGroup,
  calculateRelativeAgeQuartile,
} from "~/utils/helpers";

export type BoardState = Record<string, string[]>;

const POOL_ID = "pool";
const SEPARATOR = "::";
const ALL_VALUE = "__all__";
const NO_GROUP_VALUE = "__no_group__";
const AGE_GROUP_ORDER = [
  "U12",
  "U13",
  "U14",
  "U15",
  "U16",
  "U17",
  "U18",
  "Senior",
];

const cardId = (columnId: string, playerId: string) =>
  `${columnId}${SEPARATOR}${playerId}`;
const poolCardId = (playerId: string) => `${POOL_ID}${SEPARATOR}${playerId}`;
const parseCardId = (id: string) => {
  const index = id.indexOf(SEPARATOR);
  return {
    containerId: id.slice(0, index),
    playerId: id.slice(index + SEPARATOR.length),
  };
};

export const boardFromChart = (chart: DepthChart): BoardState => {
  const board: BoardState = {};
  for (const column of chart.columns ?? []) {
    board[column.id] = (column.slots ?? []).map((slot) => slot.playerId);
  }
  return board;
};

// Age group and relative age quartile sit under the name so the spread of a
// column is readable at a glance — a column stacked with Q1s reads very
// differently from one stacked with Q4s.
//
// The profile position is only worth showing in the squad list, where it helps
// you decide where to drop someone. Once a player is in a column, the column
// is their position for this chart's purposes.
const playerMeta = (
  player: Player | undefined,
  includePosition = false,
): string => {
  if (!player) return "";
  const quartile = player.dateOfBirth
    ? calculateRelativeAgeQuartile(player.dateOfBirth)
    : null;
  return [
    includePosition ? player.position : null,
    player.dateOfBirth ? calculateAgeGroup(player.dateOfBirth) : null,
    quartile && quartile.label !== "Q?" ? quartile.label : null,
  ]
    .filter(Boolean)
    .join(" · ");
};

// Cards are dense, so this is a tighter avatar than the shared one (which
// carries its own margin sized for the player grid).
const MiniAvatar: React.FC<{ photoUrl?: string; name?: string }> = ({
  photoUrl,
  name,
}) =>
  photoUrl ? (
    <img
      src={photoUrl}
      alt={name ?? ""}
      className="w-7 h-7 rounded-full object-cover shrink-0"
    />
  ) : (
    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
      <User size={14} className="text-gray-400" />
    </div>
  );

const PlayerCardBody: React.FC<{
  player: Player | undefined;
  rank?: number;
  onRemove?: () => void;
  dragHandleProps?: Record<string, any>;
}> = ({ player, rank, onRemove, dragHandleProps }) => (
  <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5">
    <button
      type="button"
      className="cursor-grab active:cursor-grabbing text-muted hover:text-foreground shrink-0"
      aria-label="Drag player"
      {...dragHandleProps}
    >
      <GripVertical className="w-4 h-4" />
    </button>
    {rank !== undefined && (
      <span className="text-xs font-semibold text-muted shrink-0">{rank}</span>
    )}
    <MiniAvatar photoUrl={player?.photoUrl} name={player?.name} />
    {/* Age line sits under the name, indented past the avatar. Dropping the
        profile position keeps it short enough to fit the narrow column. */}
    <div className="min-w-0 flex-1">
      <p className="text-xs text-white truncate">
        {player?.name ?? "Unknown player"}
      </p>
      {playerMeta(player) && (
        <p className="text-[10px] text-muted truncate">{playerMeta(player)}</p>
      )}
    </div>
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${player?.name ?? "player"} from this column`}
        className="text-muted hover:text-destructive shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

const SortableCard: React.FC<{
  id: string;
  player: Player | undefined;
  rank: number;
  onRemove: () => void;
}> = ({ id, player, rank, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...attributes}
    >
      <PlayerCardBody
        player={player}
        rank={rank}
        onRemove={onRemove}
        dragHandleProps={listeners}
      />
    </div>
  );
};

// Pool entries are copied into a column rather than moved, so a player can be
// ranked in as many columns as they could realistically play in.
const PoolCard: React.FC<{ player: Player; placedCount: number }> = ({
  player,
  placedCount,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: poolCardId(player.id) });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
      }}
      {...attributes}
    >
      <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted hover:text-foreground shrink-0"
          aria-label={`Drag ${player.name}`}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <MiniAvatar photoUrl={player.photoUrl} name={player.name} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white truncate">{player.name}</p>
          <p className="text-[10px] text-muted truncate">
            {playerMeta(player, true) || "No position"}
          </p>
        </div>
        {placedCount > 0 && (
          <span
            title={`Placed in ${placedCount} column${
              placedCount === 1 ? "" : "s"
            }`}
            className="text-[10px] text-muted border border-border rounded px-1 shrink-0"
          >
            {placedCount}
          </span>
        )}
      </div>
    </div>
  );
};

const ColumnHeader: React.FC<{
  name: string;
  count: number;
  isFirst: boolean;
  isLast: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}> = ({ name, count, isFirst, isLast, onRename, onDelete, onMove }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    else setDraft(name);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 mb-2">
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(name);
              setEditing(false);
            }
          }}
          className="h-7 text-xs"
          aria-label="Column name"
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={commit}
          className="text-muted hover:text-foreground"
          aria-label="Save column name"
        >
          <Check className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mb-2">
      <h3 className="text-xs font-semibold text-white uppercase truncate flex-1">
        {name}{" "}
        <span className="text-muted font-normal normal-case">({count})</span>
      </h3>
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={isFirst}
        aria-label={`Move ${name} left`}
        className="text-muted hover:text-foreground disabled:opacity-30"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={isLast}
        aria-label={`Move ${name} right`}
        className="text-muted hover:text-foreground disabled:opacity-30"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
        aria-label={`Rename ${name}`}
        className="text-muted hover:text-foreground"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${name} column`}
        className="text-muted hover:text-destructive"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const DroppableColumn: React.FC<{
  id: string;
  children: React.ReactNode;
}> = ({ id, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={[
        "flex flex-col gap-1.5 min-h-[80px] rounded-md p-1.5 transition-colors",
        isOver ? "bg-primary/10 outline outline-1 outline-primary" : "",
      ].join(" ")}
    >
      {children}
    </div>
  );
};

type DepthChartBoardProps = {
  chart: DepthChart;
  players: Player[];
  playerGroups?: PlayerGroup[];
  /**
   * Owned by the page rather than the board, so hiding the squad list sticks
   * when you switch charts (each chart remounts the board).
   */
  showSquad: boolean;
  onToggleSquad: (show: boolean) => void;
  board: BoardState;
  onBoardChange: (board: BoardState) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onAddColumn: (name: string) => void;
  onReorderColumns: (columnIds: string[]) => void;
};

export const DepthChartBoard: React.FC<DepthChartBoardProps> = ({
  chart,
  players,
  playerGroups,
  showSquad,
  onToggleSquad,
  board,
  onBoardChange,
  onRenameColumn,
  onDeleteColumn,
  onAddColumn,
  onReorderColumns,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [ageGroupFilter, setAgeGroupFilter] = useState(ALL_VALUE);
  const [groupFilter, setGroupFilter] = useState(ALL_VALUE);
  const [hidePlaced, setHidePlaced] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  const sensors = useSensors(
    // A small drag threshold keeps the remove/rename buttons clickable.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const playersById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players],
  );

  const columns = chart.columns ?? [];

  const placedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const playerIds of Object.values(board)) {
      for (const playerId of playerIds) {
        counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
      }
    }
    return counts;
  }, [board]);

  // Age groups actually present in the squad, in ladder order.
  const ageGroupOptions = useMemo(() => {
    const present = new Set<string>();
    for (const player of players) {
      if (player.dateOfBirth) present.add(calculateAgeGroup(player.dateOfBirth));
    }
    return Array.from(present).sort((a, b) => {
      const ai = AGE_GROUP_ORDER.indexOf(a);
      const bi = AGE_GROUP_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [players]);

  const playerIdToGroupIds = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const group of playerGroups ?? []) {
      for (const playerId of group.playerIds ?? []) {
        const list = map.get(playerId) ?? [];
        list.push(group.id);
        map.set(playerId, list);
      }
    }
    return map;
  }, [playerGroups]);

  const poolPlayers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return players
      .filter((p) => {
        if (hidePlaced && (placedCounts.get(p.id) ?? 0) > 0) return false;
        if (ageGroupFilter !== ALL_VALUE) {
          const ageGroup = p.dateOfBirth
            ? calculateAgeGroup(p.dateOfBirth)
            : "Unknown";
          if (ageGroup !== ageGroupFilter) return false;
        }
        if (groupFilter !== ALL_VALUE) {
          const groupIds = playerIdToGroupIds.get(p.id) ?? [];
          if (groupFilter === NO_GROUP_VALUE) {
            if (groupIds.length > 0) return false;
          } else if (!groupIds.includes(groupFilter)) {
            return false;
          }
        }
        if (!term) return true;
        return (
          p.name?.toLowerCase().includes(term) ||
          p.position?.toLowerCase().includes(term) ||
          p.club?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [
    players,
    search,
    hidePlaced,
    placedCounts,
    ageGroupFilter,
    groupFilter,
    playerIdToGroupIds,
  ]);

  // Where a dragged id currently lives: a column id, or the pool.
  const containerOf = (id: string): string | null => {
    if (id === POOL_ID) return POOL_ID;
    if (board[id]) return id;
    if (id.includes(SEPARATOR)) return parseCardId(id).containerId;
    return null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const from = containerOf(activeIdStr);
    const to = containerOf(overIdStr);
    if (!from || !to) return;

    const { playerId } = parseCardId(activeIdStr);

    // Dropped back on the pool — take the player out of the column.
    if (to === POOL_ID) {
      if (from === POOL_ID) return;
      onBoardChange({
        ...board,
        [from]: (board[from] ?? []).filter((id) => id !== playerId),
      });
      return;
    }

    const target = board[to] ?? [];
    // Dropping on a card means "put it where that card is"; dropping on the
    // column background means "put it at the bottom".
    const overIndex =
      overIdStr === to ? target.length : target.indexOf(parseCardId(overIdStr).playerId);
    const insertAt = overIndex === -1 ? target.length : overIndex;

    if (from === POOL_ID) {
      // A player can sit in several columns, but only once in each.
      if (target.includes(playerId)) return;
      const next = [...target];
      next.splice(insertAt, 0, playerId);
      onBoardChange({ ...board, [to]: next });
      return;
    }

    if (from === to) {
      const oldIndex = target.indexOf(playerId);
      if (oldIndex === -1 || oldIndex === insertAt) return;
      onBoardChange({ ...board, [to]: arrayMove(target, oldIndex, insertAt) });
      return;
    }

    // Moving between columns.
    if (target.includes(playerId)) {
      // Already ranked there, so this is just a removal from the old column.
      onBoardChange({
        ...board,
        [from]: (board[from] ?? []).filter((id) => id !== playerId),
      });
      return;
    }
    const next = [...target];
    next.splice(insertAt, 0, playerId);
    onBoardChange({
      ...board,
      [from]: (board[from] ?? []).filter((id) => id !== playerId),
      [to]: next,
    });
  };

  const activePlayer = activeId
    ? playersById.get(parseCardId(activeId).playerId)
    : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="mb-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onToggleSquad(!showSquad)}
          aria-expanded={showSquad}
        >
          {showSquad ? (
            <>
              <PanelLeftClose className="w-4 h-4 mr-1" /> Hide squad list
            </>
          ) : (
            <>
              <PanelLeftOpen className="w-4 h-4 mr-1" /> Show squad list
            </>
          )}
        </Button>
        {!showSquad && (
          <span className="text-[11px] text-muted ml-3">
            Use the × on a card to remove a player while the list is hidden.
          </span>
        )}
        <span className="text-[11px] text-muted ml-3">
          Age quartile: Q1 Sep–Nov (oldest) → Q4 Jun–Aug (youngest)
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Player pool */}
        <div className={showSquad ? "lg:w-72 shrink-0" : "hidden"}>
          <PoolPanel
            poolPlayers={poolPlayers}
            totalPlayers={players.length}
            placedCounts={placedCounts}
            search={search}
            setSearch={setSearch}
            hidePlaced={hidePlaced}
            setHidePlaced={setHidePlaced}
            ageGroupOptions={ageGroupOptions}
            ageGroupFilter={ageGroupFilter}
            setAgeGroupFilter={setAgeGroupFilter}
            playerGroups={playerGroups}
            groupFilter={groupFilter}
            setGroupFilter={setGroupFilter}
          />
        </div>

        {/* Columns wrap onto as many rows as needed rather than scrolling
            sideways, so the whole chart is visible at once. */}
        <div className="flex-1 min-w-0">
          <div className="grid gap-3 items-start pb-2 [grid-template-columns:repeat(auto-fill,minmax(13rem,1fr))]">
            {columns.map((column, index) => {
              const playerIds = board[column.id] ?? [];
              return (
                <div
                  key={column.id}
                  className="rounded-lg border border-border bg-card/40 p-2"
                >
                  <ColumnHeader
                    name={column.name}
                    count={playerIds.length}
                    isFirst={index === 0}
                    isLast={index === columns.length - 1}
                    onRename={(name) => onRenameColumn(column.id, name)}
                    onDelete={() => {
                      if (
                        confirm(
                          `Delete the "${column.name}" column and its ${playerIds.length} placement(s)?`,
                        )
                      ) {
                        onDeleteColumn(column.id);
                      }
                    }}
                    onMove={(direction) => {
                      const ids = columns.map((c) => c.id);
                      const to = index + direction;
                      if (to < 0 || to >= ids.length) return;
                      onReorderColumns(arrayMove(ids, index, to));
                    }}
                  />
                  <DroppableColumn id={column.id}>
                    <SortableContext
                      items={playerIds.map((playerId) =>
                        cardId(column.id, playerId),
                      )}
                      strategy={verticalListSortingStrategy}
                    >
                      {playerIds.length === 0 && (
                        <p className="text-[11px] text-muted text-center py-4">
                          Drag players here
                        </p>
                      )}
                      {playerIds.map((playerId, rank) => (
                        <SortableCard
                          key={cardId(column.id, playerId)}
                          id={cardId(column.id, playerId)}
                          player={playersById.get(playerId)}
                          rank={rank + 1}
                          onRemove={() =>
                            onBoardChange({
                              ...board,
                              [column.id]: playerIds.filter(
                                (id) => id !== playerId,
                              ),
                            })
                          }
                        />
                      ))}
                    </SortableContext>
                  </DroppableColumn>
                </div>
              );
            })}

            <div className="rounded-lg border border-dashed border-border p-3">
              <p className="text-xs text-muted mb-2">Add a column</p>
              <div className="flex gap-1">
                <Input
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newColumnName.trim()) {
                      onAddColumn(newColumnName.trim());
                      setNewColumnName("");
                    }
                  }}
                  placeholder="e.g. Bench"
                  className="h-8 text-xs"
                  aria-label="New column name"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2"
                  disabled={!newColumnName.trim()}
                  onClick={() => {
                    onAddColumn(newColumnName.trim());
                    setNewColumnName("");
                  }}
                  aria-label="Add column"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="w-52 opacity-90">
            <PlayerCardBody player={activePlayer} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

const PoolPanel: React.FC<{
  poolPlayers: Player[];
  totalPlayers: number;
  placedCounts: Map<string, number>;
  search: string;
  setSearch: (value: string) => void;
  hidePlaced: boolean;
  setHidePlaced: (value: boolean) => void;
  ageGroupOptions: string[];
  ageGroupFilter: string;
  setAgeGroupFilter: (value: string) => void;
  playerGroups?: PlayerGroup[];
  groupFilter: string;
  setGroupFilter: (value: string) => void;
}> = ({
  poolPlayers,
  totalPlayers,
  placedCounts,
  search,
  setSearch,
  hidePlaced,
  setHidePlaced,
  ageGroupOptions,
  ageGroupFilter,
  setAgeGroupFilter,
  playerGroups,
  groupFilter,
  setGroupFilter,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: POOL_ID });
  const filtersActive =
    ageGroupFilter !== ALL_VALUE || groupFilter !== ALL_VALUE || !!search.trim();

  return (
    <div
      ref={setNodeRef}
      className={[
        "rounded-lg border p-3 transition-colors",
        isOver ? "border-destructive bg-destructive/10" : "border-border",
      ].join(" ")}
    >
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-xs font-semibold text-white uppercase">Squad</h3>
        <span className="text-[11px] text-muted">
          {poolPlayers.length} of {totalPlayers}
        </span>
      </div>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name, position, club"
        className="h-8 text-xs mb-2"
        aria-label="Search players"
      />
      {ageGroupOptions.length > 0 && (
        <Select value={ageGroupFilter} onValueChange={setAgeGroupFilter}>
          <SelectTrigger
            className="h-8 text-xs mb-2 text-foreground border-input"
            aria-label="Filter by age group"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="text-foreground">
            <SelectGroup>
              <SelectItem value={ALL_VALUE} className="text-foreground">
                All age groups
              </SelectItem>
              {ageGroupOptions.map((ageGroup) => (
                <SelectItem
                  key={ageGroup}
                  value={ageGroup}
                  className="text-foreground"
                >
                  {ageGroup}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}

      {playerGroups && playerGroups.length > 0 && (
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger
            className="h-8 text-xs mb-2 text-foreground border-input"
            aria-label="Filter by group"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="text-foreground">
            <SelectGroup>
              <SelectItem value={ALL_VALUE} className="text-foreground">
                All groups
              </SelectItem>
              <SelectItem value={NO_GROUP_VALUE} className="text-foreground">
                Not in a group
              </SelectItem>
              {playerGroups.map((group) => (
                <SelectItem
                  key={group.id}
                  value={group.id}
                  className="text-foreground"
                >
                  {group.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}

      {filtersActive && (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            setAgeGroupFilter(ALL_VALUE);
            setGroupFilter(ALL_VALUE);
          }}
          className="text-[11px] text-muted hover:text-foreground underline mb-2"
        >
          Clear filters
        </button>
      )}

      <label className="flex items-center gap-2 text-[11px] text-muted mb-3 cursor-pointer">
        <input
          type="checkbox"
          checked={hidePlaced}
          onChange={(e) => setHidePlaced(e.target.checked)}
          className="accent-primary"
        />
        Hide players already placed
      </label>
      <p className="text-[11px] text-muted mb-2">
        {isOver
          ? "Drop here to remove from the column"
          : "Drag onto a column to rank. A player can appear in several columns."}
      </p>
      <div className="flex flex-col gap-1.5 max-h-[70vh] overflow-y-auto pr-1">
        {poolPlayers.length === 0 ? (
          <p className="text-xs text-muted py-4 text-center">
            No players match.
          </p>
        ) : (
          poolPlayers.map((player) => (
            <PoolCard
              key={player.id}
              player={player}
              placedCount={placedCounts.get(player.id) ?? 0}
            />
          ))
        )}
      </div>
    </div>
  );
};
