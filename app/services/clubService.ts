import { Club } from "../types";
import { BaseService } from "./BaseService";

export class ClubService extends BaseService {
  private readonly fieldMapping = {
    createdBy: "created_by"
  };

  async getAllClubs(): Promise<Club[]> {
    return this.getAll<Club>("clubs");
  }

  async getActiveClubs(): Promise<Club[]> {
    return this.getAll<Club>("clubs", "*", "name", { status: "active" });
  }

  async getClubById(id: string): Promise<Club | null> {
    return this.getById<Club>("clubs", id);
  }

  async getClubsByType(type: Club["type"]): Promise<Club[]> {
    const { data, error } = await this.client
      .from("clubs")
      .select("*")
      .eq("type", type)
      .eq("status", "active")
      .order("name");

    const result = this.transformResponse<Club>(data, error, []);
    return Array.isArray(result) ? result : [];
  }

  async createClub(
    clubData: Omit<Club, "id" | "createdAt">,
    createdBy: string
  ): Promise<Club> {
    return this.create<Club>("clubs", { ...clubData, createdBy }, this.fieldMapping);
  }

  async updateClub(id: string, updates: Partial<Club>): Promise<Club | null> {
    return this.update<Club>("clubs", id, updates, this.fieldMapping);
  }

  async deleteClub(id: string): Promise<boolean> {
    return this.performDelete("clubs", id);
  }
}
