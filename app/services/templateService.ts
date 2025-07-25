import { Template, TemplateAttribute } from "../types";
import { convertKeysToCamelCase } from "../utils/helpers";

export class TemplateService {
  client;
  constructor(client: any) {
    this.client = client;
  }
  async getAllTemplates(): Promise<Template[]> {
    const { data, error } = await this.client
      .from("report_templates")
      .select("*")
      .order("name");

    if (error) throw error;
    return convertKeysToCamelCase(data) || [];
  }

  async getTemplateById(templateId: string): Promise<Template> {
    const { data, error } = await this.client
      .from("report_templates")
      .select("*, template_attributes(report_attributes(*))")
      .eq("id", templateId)
      .single();

    if (error) throw error;
    return convertKeysToCamelCase(data) || null;
  }

  async addNewTemplate(
    templateData: Omit<Template, "id" | "createdAt">
  ): Promise<Template> {
    const { data, error } = await this.client
      .from("report_templates")
      .insert({
        name: templateData.name,
        active: templateData.active,
      })
      .select()
      .single();

    if (error) throw error;
    return convertKeysToCamelCase(data) || null;
  }

  async updateTemplate(
    templateData: Omit<Template, "id" | "createdAt">,
    templateId: string
  ): Promise<Template> {
    const { data, error } = await this.client
      .from("report_templates")
      .update(templateData)
      .eq("id", templateId)
      .select()
      .single();

    if (error) throw error;
    return convertKeysToCamelCase(data) || null;
  }

  async addAttributeToTemplate(
    templateData: Omit<TemplateAttribute, "id" | "createdAt">
  ): Promise<TemplateAttribute> {
    const { data, error } = await this.client
      .from("template_attributes")
      .insert({
        attribute_id: templateData.attribute_id,
        template_id: templateData.template_id,
      })
      .select()
      .single();

    if (error) throw error;
    return convertKeysToCamelCase(data) || null;
  }

  async getAttributesByTemplateId(
    templateId: string
  ): Promise<TemplateAttribute[]> {
    const { data, error } = await this.client
      .from("template_attributes")
      .select("*, report_attributes(*)")
      .eq("template_id", templateId);

    if (error) throw error;
    return convertKeysToCamelCase(data) || null;
  }
}
