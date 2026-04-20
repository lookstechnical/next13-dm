import {
  Programme,
  ProgrammeEvent,
  ProgrammeRegistration,
  ProgrammeEventAvailability,
} from "../types";
import { convertKeysToCamelCase } from "../utils/helpers";

export class ProgrammeService {
  client;
  constructor(client: any) {
    this.client = client;
  }

  async getAllProgrammes(): Promise<Programme[]> {
    const { data, error } = await this.client
      .from("programmes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return convertKeysToCamelCase(data) || [];
  }

  async getProgrammesByTeam(teamId: string): Promise<Programme[]> {
    const { data, error } = await this.client
      .from("programmes")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return convertKeysToCamelCase(data) || [];
  }

  async getProgrammeById(id: string): Promise<Programme | null> {
    const { data, error } = await this.client
      .from("programmes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return convertKeysToCamelCase(data);
  }

  async getAllPublicProgrammes(): Promise<Programme[]> {
    const { data, error } = await this.client
      .from("programmes")
      .select("*")
      .eq("can_register", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return convertKeysToCamelCase(data) || [];
  }

  async createProgramme(
    programmeData: Omit<Programme, "id" | "createdAt">,
    createdBy: string
  ): Promise<Programme> {
    const { data, error } = await this.client
      .from("programmes")
      .insert({
        team_id: programmeData.teamId,
        name: programmeData.name,
        description: programmeData.description,
        image_url: programmeData.imageUrl,
        registration_deadline: programmeData.registrationDeadline,
        can_register: programmeData.canRegister,
        status: programmeData.status,
        sections: programmeData.sections || null,
        availability_description: programmeData.availabilityDescription || null,
        eligible_dob_from: programmeData.eligibleDobFrom || null,
        eligible_dob_to: programmeData.eligibleDobTo || null,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return convertKeysToCamelCase(data);
  }

  async updateProgramme(
    id: string,
    updates: Partial<Programme>
  ): Promise<Programme | null> {
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.imageUrl !== undefined)
      updateData.image_url = updates.imageUrl;
    if (updates.registrationDeadline !== undefined)
      updateData.registration_deadline = updates.registrationDeadline;
    if (updates.canRegister !== undefined)
      updateData.can_register = updates.canRegister;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.sections !== undefined)
      updateData.sections = updates.sections;
    if (updates.availabilityDescription !== undefined)
      updateData.availability_description = updates.availabilityDescription;
    if (updates.eligibleDobFrom !== undefined)
      updateData.eligible_dob_from = updates.eligibleDobFrom || null;
    if (updates.eligibleDobTo !== undefined)
      updateData.eligible_dob_to = updates.eligibleDobTo || null;

    const { data, error } = await this.client
      .from("programmes")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return convertKeysToCamelCase(data);
  }

  async deleteProgramme(id: string): Promise<boolean> {
    const { error } = await this.client
      .from("programmes")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }

  async getProgrammeEvents(
    programmeId: string
  ): Promise<ProgrammeEvent[]> {
    const { data, error } = await this.client
      .from("programme_events")
      .select("*, events ( id, name, date, end_date, location, status )")
      .eq("programme_id", programmeId)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    const result = convertKeysToCamelCase(data) || [];
    return result.sort((a: any, b: any) => {
      const dateA = a.events?.date ? new Date(a.events.date).getTime() : 0;
      const dateB = b.events?.date ? new Date(b.events.date).getTime() : 0;
      return dateA - dateB;
    });
  }

  async addEventsToProgramme(
    programmeId: string,
    eventIds: string[]
  ): Promise<void> {
    const rows = eventIds.map((eventId, index) => ({
      programme_id: programmeId,
      event_id: eventId,
      sort_order: index,
    }));

    const { error } = await this.client
      .from("programme_events")
      .insert(rows);

    if (error) throw error;
  }

  async removeEventFromProgramme(
    programmeId: string,
    eventId: string
  ): Promise<boolean> {
    const { error } = await this.client
      .from("programme_events")
      .delete()
      .eq("programme_id", programmeId)
      .eq("event_id", eventId);

    if (error) throw error;
    return true;
  }

  async registerForProgramme(data: {
    programmeId: string;
    playerId: string;
    email?: string;
    eventAvailability: { eventId: string; available: boolean }[];
  }): Promise<ProgrammeRegistration> {
    // Create registration
    const { data: registration, error: regError } = await this.client
      .from("programme_registrations")
      .insert({
        programme_id: data.programmeId,
        player_id: data.playerId,
        email: data.email,
        status: "confirmed",
      })
      .select()
      .single();

    if (regError) throw regError;

    // Create availability rows
    if (data.eventAvailability.length > 0) {
      const availabilityRows = data.eventAvailability.map((ea) => ({
        programme_registration_id: registration.id,
        event_id: ea.eventId,
        available: ea.available,
      }));

      const { error: availError } = await this.client
        .from("programme_event_availability")
        .insert(availabilityRows);

      if (availError) throw availError;
    }

    return convertKeysToCamelCase(registration);
  }

  async getProgrammeRegistrations(
    programmeId: string
  ): Promise<ProgrammeRegistration[]> {
    const { data, error } = await this.client
      .from("programme_registrations")
      .select(
        "*, players ( id, name, photo_url, position, date_of_birth, club, email )"
      )
      .eq("programme_id", programmeId)
      .order("registered_at", { ascending: false });

    if (error) throw error;
    return convertKeysToCamelCase(data) || [];
  }

  async getProgrammeEventAvailability(
    programmeId: string
  ): Promise<ProgrammeEventAvailability[]> {
    const { data, error } = await this.client
      .from("programme_event_availability")
      .select(
        "*, programme_registrations!inner ( programme_id )"
      )
      .eq(
        "programme_registrations.programme_id",
        programmeId
      );

    if (error) throw error;
    return convertKeysToCamelCase(data) || [];
  }

  async removeRegistration(registrationId: string): Promise<boolean> {
    const { error } = await this.client
      .from("programme_registrations")
      .delete()
      .eq("id", registrationId);

    if (error) throw error;
    return true;
  }

  async getPlayerProgrammeRegistration(
    playerId: string,
    programmeId: string
  ): Promise<ProgrammeRegistration | null> {
    const { data, error } = await this.client
      .from("programme_registrations")
      .select("*")
      .eq("player_id", playerId)
      .eq("programme_id", programmeId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return convertKeysToCamelCase(data);
  }

  async uploadProgrammeImage(
    programmeId: string,
    file: any
  ): Promise<string | null> {
    const fileExt = file.name?.split(".").pop() || "jpg";
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${programmeId}/${fileName}`;

    const { error: uploadError } = await this.client.storage
      .from("programme-images")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = this.client.storage
      .from("programme-images")
      .getPublicUrl(filePath);

    // Update programme with image URL
    const { error: updateError } = await this.client
      .from("programmes")
      .update({ image_url: publicUrl })
      .eq("id", programmeId);

    if (updateError) throw updateError;

    return publicUrl;
  }
}
