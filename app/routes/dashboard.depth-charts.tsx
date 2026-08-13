import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { DownloadIcon, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BoardState,
  DepthChartBoard,
  boardFromChart,
} from "~/components/depth-chart/board";
import { downloadDepthChartCsv } from "~/components/depth-chart/export-csv";
import { AllowedRoles } from "~/components/route-protections";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { DepthChartService } from "~/services/depthChartService";
import { GroupService } from "~/services/groupService";
import { PlayerService } from "~/services/playerService";
import { DepthChart, Player } from "~/types";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [
    { title: "Depth Charts" },
    { name: "description", content: "Squad depth charts by position" },
  ];
};

export const loader: LoaderFunction = withAuth(
  AllowedRoles.coach,
  async ({ supabaseClient, user }) => {
    const depthChartService = new DepthChartService(supabaseClient);
    const playerService = new PlayerService(supabaseClient);
    const groupService = new GroupService(supabaseClient);

    const teamId = user.current_team as string;
    const charts = await depthChartService.getChartsByTeam(teamId);
    const players = await playerService.getPlayersByTeam(teamId);
    const playerGroups = await groupService.getGroupsByTeam(teamId);

    return { charts, players, playerGroups, user };
  },
);

export const action: ActionFunction = withAuthAction(
  AllowedRoles.coach,
  async ({ request, supabaseClient, user }) => {
    const depthChartService = new DepthChartService(supabaseClient);
    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    if (intent === "createChart") {
      const name = (formData.get("name") as string)?.trim();
      if (!name) return { error: "A chart needs a name." };
      const id = await depthChartService.createChart(
        user.current_team as string,
        name,
      );
      return { ok: true, createdChartId: id };
    }

    if (intent === "renameChart") {
      const chartId = formData.get("chartId") as string;
      const name = (formData.get("name") as string)?.trim();
      if (!name) return { error: "A chart needs a name." };
      await depthChartService.renameChart(chartId, name);
      return { ok: true };
    }

    if (intent === "deleteChart") {
      await depthChartService.deleteChart(formData.get("chartId") as string);
      return { ok: true };
    }

    if (intent === "addColumn") {
      const chartId = formData.get("chartId") as string;
      const name = (formData.get("name") as string)?.trim();
      if (!name) return { error: "A column needs a name." };
      await depthChartService.addColumn(chartId, name);
      return { ok: true };
    }

    if (intent === "renameColumn") {
      const columnId = formData.get("columnId") as string;
      const name = (formData.get("name") as string)?.trim();
      if (!name) return { error: "A column needs a name." };
      await depthChartService.renameColumn(columnId, name);
      return { ok: true };
    }

    if (intent === "deleteColumn") {
      await depthChartService.deleteColumn(formData.get("columnId") as string);
      return { ok: true };
    }

    if (intent === "reorderColumns") {
      const columnIds = JSON.parse(
        (formData.get("columnIds") as string) || "[]",
      ) as string[];
      await depthChartService.setColumnOrder(
        columnIds.map((id, index) => ({ id, sortOrder: index })),
      );
      return { ok: true };
    }

    if (intent === "saveBoard") {
      const chartId = formData.get("chartId") as string;
      const board = JSON.parse((formData.get("board") as string) || "[]") as {
        columnId: string;
        playerIds: string[];
      }[];
      await depthChartService.saveBoard(chartId, board);
      return { ok: true };
    }

    return null;
  },
);

export default function DepthCharts() {
  const { charts, players, playerGroups } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ createdChartId?: string }>();

  const [activeChartId, setActiveChartId] = useState<string | null>(
    charts[0]?.id ?? null,
  );
  const [newChartName, setNewChartName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  // Held here, not in the board, so it survives the remount on chart switch.
  const [showSquad, setShowSquad] = useState(true);

  // Placements are edited locally and pushed to the server after each drag, so
  // the board stays responsive; the loader is the source of truth on reload.
  const [board, setBoard] = useState<BoardState>({});
  const boardChartId = useRef<string | null>(null);

  const activeChart: DepthChart | undefined = useMemo(
    () => charts.find((c: DepthChart) => c.id === activeChartId),
    [charts, activeChartId],
  );

  // Reset the local board whenever the server data or the selected chart
  // changes — column adds/deletes come back through the loader.
  useEffect(() => {
    if (!activeChart) {
      setBoard({});
      boardChartId.current = null;
      return;
    }
    // Switching chart always reloads from the server. Otherwise wait until the
    // save has settled, so a revalidation mid-drag can't undo the newer move.
    const chartChanged = boardChartId.current !== activeChart.id;
    if (!chartChanged && fetcher.state !== "idle") return;
    setBoard(boardFromChart(activeChart));
    boardChartId.current = activeChart.id;
  }, [activeChart, fetcher.state]);

  // Select a newly created chart once it comes back from the action.
  useEffect(() => {
    const createdId = fetcher.data?.createdChartId;
    if (createdId) setActiveChartId(createdId);
  }, [fetcher.data]);

  // Fall back to the first chart if the selected one was deleted.
  useEffect(() => {
    if (charts.length === 0) {
      setActiveChartId(null);
      return;
    }
    if (!charts.some((c: DepthChart) => c.id === activeChartId)) {
      setActiveChartId(charts[0].id);
    }
  }, [charts, activeChartId]);

  const playersById = useMemo(
    () => new Map<string, Player>(players.map((p: Player) => [p.id, p])),
    [players],
  );

  const submit = (fields: Record<string, string>) =>
    fetcher.submit(fields, { method: "post" });

  const persistBoard = (next: BoardState, chartId: string) => {
    submit({
      intent: "saveBoard",
      chartId,
      board: JSON.stringify(
        Object.entries(next).map(([columnId, playerIds]) => ({
          columnId,
          playerIds,
        })),
      ),
    });
  };

  const handleBoardChange = (next: BoardState) => {
    setBoard(next);
    if (activeChartId) persistBoard(next, activeChartId);
  };

  const createChart = () => {
    const name = newChartName.trim();
    if (!name) return;
    submit({ intent: "createChart", name });
    setNewChartName("");
  };

  return (
    <div className="container px-4 mx-auto py-10 text-foreground">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Depth Charts</h1>
          <p className="text-sm text-muted">
            Rank players by position, regardless of the position on their
            profile. Drag from the squad list into a column, and drag within a
            column to change the order.
          </p>
        </div>
        <div className="flex gap-2 items-center shrink-0">
          <Input
            value={newChartName}
            onChange={(e) => setNewChartName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createChart();
            }}
            placeholder="New chart name"
            className="h-9 w-48 text-sm"
            aria-label="New chart name"
          />
          <Button
            type="button"
            variant="outline"
            className="h-9"
            disabled={!newChartName.trim()}
            onClick={createChart}
          >
            <Plus className="w-4 h-4 mr-1" /> New chart
          </Button>
        </div>
      </div>

      {charts.length === 0 ? (
        <div className="rounded-lg border border-border p-10 text-center">
          <p className="text-muted mb-1">No depth charts yet.</p>
          <p className="text-xs text-muted">
            Create one above — it starts with a column for each position, which
            you can rename, reorder or add to.
          </p>
        </div>
      ) : (
        <>
          {/* Every chart is reachable here without leaving the page. */}
          <div className="flex flex-wrap gap-2 mb-4 border-b border-border pb-3">
            {charts.map((chart: DepthChart) => {
              const active = chart.id === activeChartId;
              return (
                <button
                  key={chart.id}
                  type="button"
                  onClick={() => {
                    setActiveChartId(chart.id);
                    setRenaming(false);
                  }}
                  aria-pressed={active}
                  className={[
                    "px-3 py-1.5 rounded-md border text-sm transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-white"
                      : "border-border text-foreground hover:bg-card/50",
                  ].join(" ")}
                >
                  {chart.name}
                </button>
              );
            })}
          </div>

          {activeChart && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                {renaming ? (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setRenaming(false);
                        if (e.key === "Enter" && renameDraft.trim()) {
                          submit({
                            intent: "renameChart",
                            chartId: activeChart.id,
                            name: renameDraft.trim(),
                          });
                          setRenaming(false);
                        }
                      }}
                      className="h-9 w-56 text-sm"
                      aria-label="Chart name"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9"
                      disabled={!renameDraft.trim()}
                      onClick={() => {
                        submit({
                          intent: "renameChart",
                          chartId: activeChart.id,
                          name: renameDraft.trim(),
                        });
                        setRenaming(false);
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9"
                      onClick={() => setRenaming(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-white">
                      {activeChart.name}
                    </h2>
                    <button
                      type="button"
                      className="text-xs text-muted hover:text-foreground underline"
                      onClick={() => {
                        setRenameDraft(activeChart.name);
                        setRenaming(true);
                      }}
                    >
                      Rename
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {fetcher.state !== "idle" && (
                    <span className="text-xs text-muted">Saving…</span>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
                    onClick={() =>
                      downloadDepthChartCsv(activeChart, playersById)
                    }
                  >
                    <DownloadIcon className="w-4 h-4 mr-1" /> Export CSV
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (
                        confirm(
                          `Delete the "${activeChart.name}" depth chart? This cannot be undone.`,
                        )
                      ) {
                        submit({
                          intent: "deleteChart",
                          chartId: activeChart.id,
                        });
                      }
                    }}
                    aria-label="Delete chart"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <DepthChartBoard
                key={activeChart.id}
                chart={activeChart}
                players={players}
                playerGroups={playerGroups}
                showSquad={showSquad}
                onToggleSquad={setShowSquad}
                board={board}
                onBoardChange={handleBoardChange}
                onAddColumn={(name) =>
                  submit({ intent: "addColumn", chartId: activeChart.id, name })
                }
                onRenameColumn={(columnId, name) =>
                  submit({ intent: "renameColumn", columnId, name })
                }
                onDeleteColumn={(columnId) =>
                  submit({ intent: "deleteColumn", columnId })
                }
                onReorderColumns={(columnIds) =>
                  submit({
                    intent: "reorderColumns",
                    columnIds: JSON.stringify(columnIds),
                  })
                }
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
