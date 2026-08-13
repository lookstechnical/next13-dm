import { convertKeysToCamelCase, POSITIONS } from "~/utils/helpers";
import { DepthChart } from "../types";

export class DepthChartService {
  client;
  constructor(client: any) {
    this.client = client;
  }

  // Every chart for a team, with its columns and the players placed in them.
  // The whole set is loaded at once because the page shows all charts together
  // and switches between them without a round trip.
  async getChartsByTeam(teamId: string): Promise<DepthChart[]> {
    const { data, error } = await this.client
      .from("depth_charts")
      .select(
        `
        *,
        depth_chart_columns (
          *,
          depth_chart_slots ( * )
        )
      `
      )
      .eq("team_id", teamId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Nested relations come back under their table names and unordered, so
    // rename them to what the UI expects and sort before camel-casing.
    const charts = (data || []).map((chart: any) => {
      const { depth_chart_columns, ...rest } = chart;
      return {
        ...rest,
        columns: [...(depth_chart_columns || [])]
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((column: any) => {
            const { depth_chart_slots, ...columnRest } = column;
            return {
              ...columnRest,
              slots: [...(depth_chart_slots || [])].sort(
                (a: any, b: any) => a.sort_order - b.sort_order
              ),
            };
          }),
      };
    });

    return convertKeysToCamelCase(charts);
  }

  // A new chart starts with a column per standard position, so it is usable
  // straight away; columns can be renamed, reordered, added or removed after.
  async createChart(teamId: string, name: string): Promise<string> {
    const { data: existing, error: countError } = await this.client
      .from("depth_charts")
      .select("sort_order")
      .eq("team_id", teamId)
      .order("sort_order", { ascending: false })
      .limit(1);

    if (countError) throw countError;

    const nextOrder = existing?.length ? existing[0].sort_order + 1 : 0;

    const { data: chart, error } = await this.client
      .from("depth_charts")
      .insert({ team_id: teamId, name, sort_order: nextOrder })
      .select()
      .single();

    if (error) throw error;

    const columns = POSITIONS.map((position, index) => ({
      depth_chart_id: chart.id,
      name: position,
      sort_order: index,
    }));

    const { error: columnError } = await this.client
      .from("depth_chart_columns")
      .insert(columns);

    if (columnError) throw columnError;

    return chart.id;
  }

  async renameChart(chartId: string, name: string): Promise<void> {
    const { error } = await this.client
      .from("depth_charts")
      .update({ name })
      .eq("id", chartId);

    if (error) throw error;
  }

  async deleteChart(chartId: string): Promise<void> {
    const { error } = await this.client
      .from("depth_charts")
      .delete()
      .eq("id", chartId);

    if (error) throw error;
  }

  async addColumn(chartId: string, name: string): Promise<void> {
    const { data: existing, error: orderError } = await this.client
      .from("depth_chart_columns")
      .select("sort_order")
      .eq("depth_chart_id", chartId)
      .order("sort_order", { ascending: false })
      .limit(1);

    if (orderError) throw orderError;

    const nextOrder = existing?.length ? existing[0].sort_order + 1 : 0;

    const { error } = await this.client
      .from("depth_chart_columns")
      .insert({ depth_chart_id: chartId, name, sort_order: nextOrder });

    if (error) throw error;
  }

  async renameColumn(columnId: string, name: string): Promise<void> {
    const { error } = await this.client
      .from("depth_chart_columns")
      .update({ name })
      .eq("id", columnId);

    if (error) throw error;
  }

  async deleteColumn(columnId: string): Promise<void> {
    const { error } = await this.client
      .from("depth_chart_columns")
      .delete()
      .eq("id", columnId);

    if (error) throw error;
  }

  async setColumnOrder(
    columns: { id: string; sortOrder: number }[]
  ): Promise<void> {
    for (const column of columns) {
      const { error } = await this.client
        .from("depth_chart_columns")
        .update({ sort_order: column.sortOrder })
        .eq("id", column.id);

      if (error) throw error;
    }
  }

  // Replace the placements for a whole chart in one go. The board posts its
  // full state after every drag, so a save is always the complete picture —
  // which keeps the client simple at the cost of last-write-wins if two people
  // edit the same chart at the same time.
  async saveBoard(
    chartId: string,
    board: { columnId: string; playerIds: string[] }[]
  ): Promise<void> {
    const { data: columns, error: columnError } = await this.client
      .from("depth_chart_columns")
      .select("id")
      .eq("depth_chart_id", chartId);

    if (columnError) throw columnError;

    const columnIds = (columns || []).map((c: { id: string }) => c.id);
    if (columnIds.length === 0) return;

    // Only touch columns that belong to this chart, so a tampered payload
    // can't clear another chart's placements.
    const ownedIds = new Set(columnIds);
    const owned = board.filter((entry) => ownedIds.has(entry.columnId));

    const { error: deleteError } = await this.client
      .from("depth_chart_slots")
      .delete()
      .in("depth_chart_column_id", columnIds);

    if (deleteError) throw deleteError;

    const rows = owned.flatMap((entry) =>
      entry.playerIds.map((playerId, index) => ({
        depth_chart_column_id: entry.columnId,
        player_id: playerId,
        sort_order: index,
      }))
    );

    if (rows.length === 0) return;

    const { error: insertError } = await this.client
      .from("depth_chart_slots")
      .insert(rows);

    if (insertError) throw insertError;
  }
}
