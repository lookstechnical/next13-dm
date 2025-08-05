import { Attribute } from "../types";
import { convertKeysToCamelCase } from "../utils/helpers";

export class AttributesService {
  client;
  constructor(client: any) {
    this.client = client;
  }
  async getAllAttributes(): Promise<Attribute[]> {
    const { data, error } = await this.client
      .from("report_attributes")
      .select("*")
      .order("name");

    if (error) throw error;
    return convertKeysToCamelCase(data) || [];
  }

  async getAttribueById(attributeId: string): Promise<Attribute> {
    const { data, error } = await this.client
      .from("report_attributes")
      .select("*")
      .eq("id", attributeId)
      .single();

    if (error) throw error;
    return convertKeysToCamelCase(data) || null;
  }

  async addNewAttribue(
    attributeData: Omit<Attribute, "id" | "createdAt">
  ): Promise<Attribute> {
    const { data, error } = await this.client
      .from("report_attributes")
      .insert({
        name: attributeData.name,
        description: attributeData.description,
        active: attributeData.active,
        category: attributeData.category,
      })
      .select()
      .single();

    if (error) throw error;
    return convertKeysToCamelCase(data) || null;
  }

  async updateAtrribute(
    attributeData: Omit<Attribute, "id" | "createdAt">,
    attributeId: string
  ): Promise<Attribute> {
    const { data, error } = await this.client
      .from("report_attributes")
      .update(attributeData)
      .eq("id", attributeId)
      .select()
      .single();

    if (error) throw error;
    return convertKeysToCamelCase(data) || null;
  }
}
