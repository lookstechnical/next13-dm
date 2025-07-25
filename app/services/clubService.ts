import { Club } from "../types";

export class ClubService {
  client;
  constructor(client: any) {
    this.client = client;
  }
  async getAllClubs(): Promise<Club[]> {
    const { data, error } = await this.client
      .from("clubs")
      .select("*")
      .order("name");

    if (error) throw error;
    return data || [];
  }

  async getActiveClubs(): Promise<Club[]> {
    const { data, error } = await this.client
      .from("clubs")
      .select("*")
      .eq("status", "active")
      .order("name");

    if (error) throw error;
    return data || [];
  }

  async getClubById(id: string): Promise<Club | null> {
    const { data, error } = await this.client
      .from("clubs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return data;
  }

  async getClubsByType(type: Club["type"]): Promise<Club[]> {
    const { data, error } = await this.client
      .from("clubs")
      .select("*")
      .eq("type", type)
      .eq("status", "active")
      .order("name");

    if (error) throw error;
    return data || [];
  }

  async createClub(
    clubData: Omit<Club, "id" | "createdAt">,
    createdBy: string
  ): Promise<Club> {
    const { data, error } = await this.client
      .from("clubs")
      .insert({
        name: clubData.name,
        type: clubData.type,
        location: clubData.location,
        founded: clubData.founded,
        website: clubData.website,
        status: clubData.status,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateClub(id: string, updates: Partial<Club>): Promise<Club | null> {
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.founded !== undefined) updateData.founded = updates.founded;
    if (updates.website !== undefined) updateData.website = updates.website;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { data, error } = await this.client
      .from("clubs")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  async deleteClub(id: string): Promise<boolean> {
    const { error } = await this.client.from("clubs").delete().eq("id", id);

    if (error) throw error;
    return true;
  }
}
