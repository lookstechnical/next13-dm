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

  async updateDrill(drillId: string, drillData: Omit<Drill, "id" | "eventId">) {
    const { data, error } = await this.client
      .from("drills")
      .update(drillData)
      .eq("id", drillId)
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

    for (const category of categories) {
      console.log({ category });
      if (category.includes("new")) {
        const { data: categoryData } = await this.client
          .from("categories")
          .insert({ name: category.replace("new:", "") })
          .select()
          .single();

        if (categoryData) {
          const { data, error } = await this.client
            .from("drill_categories")
            .insert({ drill_id: drillId, category_id: categoryData.id });
        }
      } else {
        const { data, error } = await this.client
          .from("drill_categories")
          .insert({ drill_id: drillId, category_id: category });

        if (error) console.log({ error });
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

  async uploadDrillImage(image: any, drillId: string) {
    if (image) {
      if (!(image instanceof File)) {
        return { error: "Invalid file upload." };
      }

      if (image.size === 0) {
        return { error: "empty file" };
      }

      const fileExt = image.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error } = await this.client.storage
        .from("drill-images")
        .upload(filePath, image);

      if (error) {
        return { error: error.message };
      }

      return await this.updateDrill(drillId, {
        image_url: filePath,
      });
    }
  }

  async uploadDrillVideo(image: any, drillId: string) {
    if (image) {
      if (!(image instanceof File)) {
        return { error: "Invalid file upload." };
      }

      if (image.size === 0) {
        return { error: "empty file" };
      }

      const fileExt = image.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error } = await this.client.storage
        .from("drill-images")
        .upload(filePath, image);

      if (error) {
        return { error: error.message };
      }

      return await this.updateDrill(drillId, {
        video_url: filePath,
      });
    }
  }

  async getAllDrillCategories() {
    const { data, error } = await this.client.from("categories").select("*");

    return convertKeysToCamelCase(data);
  }
}
