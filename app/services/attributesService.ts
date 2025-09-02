import { Attribute } from "../types";
import { BaseService } from "./BaseService";
import { staticDataCache } from "./CacheManager";

export class AttributesService extends BaseService {
  constructor(client: any) {
    // Use static data cache for attributes (longer TTL)
    super(client, staticDataCache);
  }
  async getAllAttributes(): Promise<Attribute[]> {
    return this.getAll<Attribute>("report_attributes");
  }

  async getAttributeById(attributeId: string): Promise<Attribute | null> {
    return this.getById<Attribute>("report_attributes", attributeId);
  }

  async addNewAttribute(
    attributeData: Omit<Attribute, "id" | "createdAt">
  ): Promise<Attribute> {
    return this.create<Attribute>("report_attributes", attributeData);
  }

  async updateAttribute(
    attributeId: string,
    attributeData: Partial<Attribute>
  ): Promise<Attribute | null> {
    return this.update<Attribute>("report_attributes", attributeId, attributeData);
  }

  async deleteAttribute(attributeId: string): Promise<boolean> {
    return this.performDelete("report_attributes", attributeId);
  }
}
