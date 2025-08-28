import { Drill } from "~/types";
import { convertKeysToCamelCase } from "../utils/helpers";

export class DrillsService {
  client;
  constructor(client: any) {
    this.client = client;
  }

  async addDrill(drillData: Omit<Drill, "id" | "eventId">) {
    const { data, error } = await this.client
      .from("drills")
      .insert({
        name: drillData.name,
        description: drillData.description,
        intensity: drillData.intensity,
        video_url: drillData.videoUrl,
        image_url: drillData.imageUrl,
      })
      .select()
      .single();

    if (error) {
      console.log(error);
      throw error;
    }
    return convertKeysToCamelCase(data);
  }

  async updateDrillCategories(drillId: string, categories: string[]) {
    const { data: deleteData, error: deleteError } = await this.client
      .from("drill_categories")
      .delete()
      .eq("drill_id", drillId);

    for (const category in categories) {
      if (category.includes("new")) {
      } else {
        const { data, error } = await this.client
          .from("drills")
          .insert({ drill_id: drillId, category_id: category });
      }
    }

    return convertKeysToCamelCase({ status: "success" });
  }

  async getAllDrills(name: string, categoryFilter: string[]) {
    const query = this.client.from("drills").select("*, categories(*)");

    if (categoryFilter?.length > 0) {
      query
        .select("*, categories(*), drill_categories!inner(category_id)")
        .in("drill_categories.category_id", categoryFilter);
    } else {
      query.select("*, categories(*)");
    }

    if (name) {
      query.ilike("name", `${name}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return convertKeysToCamelCase(data);
  }

  async getDrillById(id: string) {
    const { data, error } = await this.client
      .from("drills")
      .select("*, categories(*)")
      .eq("id", id)
      .single();

    if (data?.image_url) {
      const { data: imageData, error } = await this.client.storage
        .from("drill-images")
        .createSignedUrl(data.image_url, 30);
      data.image_url = imageData?.signedUrl;

      if (error) {
        console.log({ error });
      }
    }

    return convertKeysToCamelCase(data);
  }

  async getAllDrillCategories() {
    const { data, error } = await this.client.from("categories").select("*");

    return convertKeysToCamelCase(data);
  }
}
