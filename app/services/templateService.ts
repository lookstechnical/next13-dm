import { Template, TemplateAttribute } from "../types";
import { BaseService } from "./BaseService";
import { staticDataCache } from "./CacheManager";

export class TemplateService extends BaseService {
  constructor(client: any) {
    // Use static data cache for templates (longer TTL)
    super(client, staticDataCache);
  }
  async getAllTemplates(): Promise<Template[]> {
    return this.getAll<Template>("report_templates");
  }

  async getTemplateById(templateId: string): Promise<Template | null> {
    return this.getById<Template>(
      "report_templates", 
      templateId, 
      "*, template_attributes(report_attributes(*))"
    );
  }

  async addNewTemplate(
    templateData: Omit<Template, "id" | "createdAt">
  ): Promise<Template> {
    return this.create<Template>("report_templates", templateData);
  }

  async updateTemplate(
    templateId: string,
    templateData: Partial<Template>
  ): Promise<Template | null> {
    const { data, error } = await this.client
      .from("report_templates")
      .update(templateData)
      .eq("id", templateId)
      .select("*, template_attributes(attribute_id)")
      .single();

    return this.transformSingleResponse<Template>(data, error);
  }

  async addAttributeToTemplate(
    templateData: Omit<TemplateAttribute, "id" | "createdAt">
  ): Promise<TemplateAttribute> {
    return this.create<TemplateAttribute>("template_attributes", templateData);
  }

  async removeAttributeFromTemplate(
    templateData: Omit<TemplateAttribute, "id" | "createdAt">
  ): Promise<boolean> {
    const { error } = await this.client
      .from("template_attributes")
      .delete()
      .eq("attribute_id", templateData.attribute_id)
      .eq("template_id", templateData.template_id);

    if (error) throw error;
    return true;
  }

  async getAttributesByTemplateId(
    templateId: string
  ): Promise<TemplateAttribute[]> {
    const { data, error } = await this.client
      .from("template_attributes")
      .select("*, report_attributes(*)")
      .eq("template_id", templateId);

    const result = this.transformResponse<TemplateAttribute>(data, error, []);
    return Array.isArray(result) ? result : [];
  }
}
