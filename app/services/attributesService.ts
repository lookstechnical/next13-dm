import { Attribute } from "../types";
import { supabase } from "../lib/supabase";
import { convertKeysToCamelCase } from "../utils/helpers";

export class AttributesService {
  async getAllAttributes(): Promise<Attribute[]> {
    const { data, error } = await supabase
      .from("report_attributes")
      .select("*")
      .order("name");

    if (error) throw error;
    return convertKeysToCamelCase(data) || [];
  }

  async getAttribueById(attributeId: string): Promise<Attribute> {
    const { data, error } = await supabase
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
    const { data, error } = await supabase
      .from("report_attributes")
      .insert({
        name: attributeData.name,
        description: attributeData.description,
        active: attributeData.active,
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
    const { data, error } = await supabase
      .from("report_attributes")
      .update(attributeData)
      .eq("id", attributeId)
      .select()
      .single();

    if (error) throw error;
    return convertKeysToCamelCase(data) || null;
  }
}

// Export singleton instance
export const attributesService = new AttributesService();
