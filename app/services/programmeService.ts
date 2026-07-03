import {
  Programme,
  ProgrammeEvent,
  ProgrammeRegistration,
  ProgrammeEventAvailability,
  ProgrammeAllowedEmail,
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

  async getProgrammeByUrl(url: string): Promise<Programme | null> {
    const { data, error } = await this.client
      .from("programmes")
      .select("*")
      .eq("url", url)
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
        url: programmeData.url || null,
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
    if (updates.url !== undefined) updateData.url = updates.url || null;
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

    // Register the player for each event they marked as available, skipping
    // any events they're already registered for so re-registration is safe.
    const availableEventIds = data.eventAvailability
      .filter((ea) => ea.available)
      .map((ea) => ea.eventId);

    if (availableEventIds.length > 0) {
      const { data: existing, error: existingError } = await this.client
        .from("event_registrations")
        .select("event_id")
        .eq("player_id", data.playerId)
        .in("event_id", availableEventIds);

      if (existingError) throw existingError;

      const existingIds = new Set(
        (existing || []).map((r: { event_id: string }) => r.event_id)
      );
      const newEventRegistrations = availableEventIds
        .filter((eventId) => !existingIds.has(eventId))
        .map((eventId) => ({
          event_id: eventId,
          player_id: data.playerId,
          status: "confirmed",
        }));

      if (newEventRegistrations.length > 0) {
        const { error: eventRegError } = await this.client
          .from("event_registrations")
          .insert(newEventRegistrations);

        if (eventRegError) throw eventRegError;
      }
    }

    return convertKeysToCamelCase(registration);
  }

  async getProgrammeRegistrations(
    programmeId: string
  ): Promise<ProgrammeRegistration[]> {
    const { data, error } = await this.client
      .from("programme_registrations")
      .select(
        "*, players ( id, name, photo_url, position, secondary_position, date_of_birth, club, email )"
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
    const { data: registration, error: regError } = await this.client
      .from("programme_registrations")
      .select("player_id, programme_id")
      .eq("id", registrationId)
      .single();

    if (regError) throw regError;

    if (registration) {
      const { data: programmeEventRows, error: peError } = await this.client
        .from("programme_events")
        .select("event_id")
        .eq("programme_id", registration.programme_id);

      if (peError) throw peError;

      const eventIds = (programmeEventRows || []).map(
        (pe: { event_id: string }) => pe.event_id
      );

      if (eventIds.length > 0) {
        const { error: eventRegError } = await this.client
          .from("event_registrations")
          .delete()
          .eq("player_id", registration.player_id)
          .in("event_id", eventIds);

        if (eventRegError) throw eventRegError;
      }
    }

    const { error } = await this.client
      .from("programme_registrations")
      .delete()
      .eq("id", registrationId);

    if (error) throw error;
    return true;
  }

  async getRegistrationAvailability(
    registrationId: string
  ): Promise<ProgrammeEventAvailability[]> {
    const { data, error } = await this.client
      .from("programme_event_availability")
      .select("*")
      .eq("programme_registration_id", registrationId);

    if (error) throw error;
    return convertKeysToCamelCase(data) || [];
  }

  // Update an existing registration's availability. Replaces the availability
  // rows and syncs event_registrations: the player is registered for events
  // they newly marked available and removed from events they marked
  // unavailable.
  async updateProgrammeAvailability(data: {
    registrationId: string;
    playerId: string;
    eventAvailability: { eventId: string; available: boolean }[];
  }): Promise<void> {
    // Replace availability rows
    const { error: deleteError } = await this.client
      .from("programme_event_availability")
      .delete()
      .eq("programme_registration_id", data.registrationId);

    if (deleteError) throw deleteError;

    if (data.eventAvailability.length > 0) {
      const availabilityRows = data.eventAvailability.map((ea) => ({
        programme_registration_id: data.registrationId,
        event_id: ea.eventId,
        available: ea.available,
      }));

      const { error: availError } = await this.client
        .from("programme_event_availability")
        .insert(availabilityRows);

      if (availError) throw availError;
    }

    const availableEventIds = data.eventAvailability
      .filter((ea) => ea.available)
      .map((ea) => ea.eventId);
    const unavailableEventIds = data.eventAvailability
      .filter((ea) => !ea.available)
      .map((ea) => ea.eventId);

    // Remove event registrations the player is no longer available for
    if (unavailableEventIds.length > 0) {
      const { error: removeError } = await this.client
        .from("event_registrations")
        .delete()
        .eq("player_id", data.playerId)
        .in("event_id", unavailableEventIds);

      if (removeError) throw removeError;
    }

    // Register the player for newly-available events, skipping any they're
    // already registered for.
    if (availableEventIds.length > 0) {
      const { data: existing, error: existingError } = await this.client
        .from("event_registrations")
        .select("event_id")
        .eq("player_id", data.playerId)
        .in("event_id", availableEventIds);

      if (existingError) throw existingError;

      const existingIds = new Set(
        (existing || []).map((r: { event_id: string }) => r.event_id)
      );
      const newEventRegistrations = availableEventIds
        .filter((eventId) => !existingIds.has(eventId))
        .map((eventId) => ({
          event_id: eventId,
          player_id: data.playerId,
          status: "confirmed",
        }));

      if (newEventRegistrations.length > 0) {
        const { error: eventRegError } = await this.client
          .from("event_registrations")
          .insert(newEventRegistrations);

        if (eventRegError) throw eventRegError;
      }
    }
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

  // Load a single registration with its player and programme, used by the
  // one-click withdraw link in programme emails (keyed by the registration's
  // unguessable UUID).
  async getRegistrationById(
    registrationId: string
  ): Promise<ProgrammeRegistration | null> {
    const { data, error } = await this.client
      .from("programme_registrations")
      .select(
        "*, players ( id, name, email ), programmes ( id, name, url )"
      )
      .eq("id", registrationId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return convertKeysToCamelCase(data);
  }

  async getAllowedEmails(
    programmeId: string
  ): Promise<ProgrammeAllowedEmail[]> {
    const { data, error } = await this.client
      .from("programme_allowed_emails")
      .select("*")
      .eq("programme_id", programmeId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return convertKeysToCamelCase(data) || [];
  }

  async addAllowedEmail(
    programmeId: string,
    email: string
  ): Promise<void> {
    const { error } = await this.client
      .from("programme_allowed_emails")
      .upsert(
        { programme_id: programmeId, email: email.trim().toLowerCase() },
        { onConflict: "programme_id,email", ignoreDuplicates: true }
      );

    if (error) throw error;
  }

  async removeAllowedEmail(id: string): Promise<void> {
    const { error } = await this.client
      .from("programme_allowed_emails")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  async isEmailAllowed(
    programmeId: string,
    email: string
  ): Promise<boolean> {
    const { data, error } = await this.client
      .from("programme_allowed_emails")
      .select("id")
      .eq("programme_id", programmeId)
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (error) throw error;
    return !!data;
  }

  async createValidationCode(
    email: string,
    playerId: string
  ): Promise<string> {
    const normalizedEmail = email.toLowerCase();

    // Invalidate any existing unused codes for this email
    await this.client
      .from("validation_codes")
      .update({ used: true })
      .eq("email", normalizedEmail)
      .eq("used", false);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const { error } = await this.client.from("validation_codes").insert({
      email: normalizedEmail,
      code,
      player_id: playerId,
      expires_at: expiresAt.toISOString(),
      used: false,
    });

    if (error) throw error;
    return code;
  }

  async validateCode(
    email: string,
    code: string
  ): Promise<{ valid: boolean; playerId?: string }> {
    const { data, error } = await this.client
      .from("validation_codes")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("code", code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !data) return { valid: false };

    await this.client
      .from("validation_codes")
      .update({ used: true })
      .eq("id", data.id);

    return { valid: true, playerId: data.player_id };
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
