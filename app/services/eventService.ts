import { Event, EventRegistration, ValidationCode } from "../types";
import { convertKeysToCamelCase } from "../utils/helpers";
import { withCache, cacheManager } from "./cache";
import { CacheInvalidationService, CacheTTL } from "./cacheInvalidation";

export class EventService {
  client;
  constructor(client: any) {
    this.client = client;
  }
  async getAllEvents(): Promise<Event[]> {
    const cacheKey = cacheManager.generateKey("events", "getAllEvents");

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await this.client
          .from("events")
          .select("*")
          .order("date");

        if (error) throw error;
        return data || [];
      },
      { ttl: CacheTTL.EVENTS }
    );
  }

  async getEventById(id: string): Promise<Event | null> {
    const { data, error } = await this.client
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return convertKeysToCamelCase(data);
  }

  async getEventsByScout(scoutId: string): Promise<Event[]> {
    const { data, error } = await this.client
      .from("events")
      .select("*")
      .eq("scout_id", scoutId)
      .order("date");

    if (error) throw error;
    return data || [];
  }

  async getEventsByTeam(teamId: string): Promise<Event[]> {
    const { data, error } = await this.client
      .from("events")
      .select("id, name, location, date")
      .eq("team_id", teamId)
      .order("date", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getNextEvent(teamId: string): Promise<Event | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from("events")
      .select("*")
      .eq("team_id", teamId)
      .gte("date", now)
      .order("date", { ascending: true })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return data;
  }

  async getVisibleEvents(
    scoutId?: string,
    isHeadScout?: boolean
  ): Promise<Event[]> {
    if (isHeadScout) {
      return this.getAllEvents();
    }

    return scoutId ? this.getEventsByScout(scoutId) : [];
  }

  async getAllPublicEvents(): Promise<Event[]> {
    const { data, error } = await this.client
      .from("events")
      .select("*")
      .eq("can_register", "TRUE")
      .order("date");

    if (error) throw error;
    return convertKeysToCamelCase(data) || [];
  }

  async createEvent(
    eventData: Omit<Event, "id" | "scoutId" | "createdAt">,
    scoutId: string
  ): Promise<Event> {
    if (!eventData.teamId) {
      throw new Error("Team ID is required for event creation");
    }

    const { data, error } = await this.client
      .from("events")
      .insert({
        team_id: eventData.teamId,
        name: eventData.name,
        description: eventData.description,
        date: eventData.date,
        end_date: eventData.endDate,
        location: eventData.location,
        age_group: eventData.ageGroup,
        max_participants: eventData.maxParticipants,
        registration_deadline: eventData.registrationDeadline,
        cost: eventData.cost,
        requirements: eventData.requirements,
        scout_id: scoutId,
        status: eventData.status,
        event_type: eventData.eventType,
        can_register: eventData.canRegister,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateEvent(
    id: string,
    updates: Partial<Event>
  ): Promise<Event | null> {
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.ageGroup !== undefined) updateData.age_group = updates.ageGroup;
    if (updates.maxParticipants !== undefined)
      updateData.max_participants = updates.maxParticipants;
    if (updates.registrationDeadline !== undefined)
      updateData.registration_deadline = updates.registrationDeadline;
    if (updates.cost !== undefined) updateData.cost = updates.cost;
    if (updates.requirements !== undefined)
      updateData.requirements = updates.requirements;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.eventType !== undefined)
      updateData.event_type = updates.eventType;

    const { data, error } = await this.client
      .from("events")
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

  async deleteEvent(id: string): Promise<boolean> {
    const { error } = await this.client.from("events").delete().eq("id", id);

    if (error) throw error;
    return true;
  }

  // Registration methods
  async getAllRegistrations(): Promise<EventRegistration[]> {
    const { data, error } = await this.client
      .from("event_registrations")
      .select("*")
      .order("registered_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getEventRegistrations(eventId: string): Promise<EventRegistration[]> {
    const { data, error } = await this.client
      .from("event_registrations")
      .select(
        "*, players ( name,photo_url, position, dateOfBirth:date_of_birth, id, club, player_group_members(group_id) )"
      )
      .eq("event_id", eventId)
      .order("players(name)", { ascending: true });

    if (error) throw error;
    return convertKeysToCamelCase(data) || [];
  }

  async getPlayerEventRegistrations(
    playerId: string
  ): Promise<EventRegistration[]> {
    const { data, error } = await this.client
      .from("event_registrations")
      .select("*")
      .eq("player_id", playerId)
      .order("registered_at", { ascending: false });

    if (error) throw error;
    return convertKeysToCamelCase(data) || [];
  }

  async getPlayerEventRegistrationById(
    playerId: string,
    eventId: string
  ): Promise<EventRegistration> {
    const { data, error } = await this.client
      .from("event_registrations")
      .select("*")
      .eq("player_id", playerId)
      .eq("event_id", eventId)
      .single();

    if (error) throw error;
    return data || [];
  }

  async updateAttendanceById(
    attendance: "attended" | "confirmed",
    playerId: string,
    eventId: string
  ): Promise<EventRegistration[]> {
    const { data, error } = await this.client
      .from("event_registrations")
      .update({ status: attendance })
      .eq("player_id", playerId)
      .eq("event_id", eventId)
      .single();

    if (error) throw error;
    return data || [];
  }

  async addEventRegistration(
    registrationData: Omit<EventRegistration, "id" | "registeredAt" | "players">
  ): Promise<EventRegistration> {
    const { data, error } = await this.client
      .from("event_registrations")
      .insert({
        event_id: registrationData.eventId,
        player_id: registrationData.playerId,
        status: registrationData.status,
        email: registrationData.email,
        notes: registrationData.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateRegistration(
    id: string,
    updates: Partial<EventRegistration>
  ): Promise<EventRegistration | null> {
    const updateData: any = {};

    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await this.client
      .from("event_registrations")
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

  async deleteRegistration(id: string): Promise<boolean> {
    const { error } = await this.client
      .from("event_registrations")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }

  // Validation code methods
  async sendValidationCode(
    email: string,
    players: any[]
  ): Promise<{ success: boolean; playerId?: string; message: string }> {
    // Check if player exists with this email
    const existingPlayer = players.find(
      (player) => player.email?.toLowerCase() === email.toLowerCase()
    );

    if (!existingPlayer) {
      return {
        success: false,
        message:
          "No player found with this email address. You can create a new player profile.",
      };
    }

    // Generate validation code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiry

    const { error } = await this.client.from("validation_codes").insert({
      email: email.toLowerCase(),
      code,
      player_id: existingPlayer.id,
      expires_at: expiresAt.toISOString(),
      used: false,
    });

    if (error) throw error;

    // In a real app, you would send this code via email
    // For demo purposes, we'll show it in an alert
    alert(
      `Validation code sent to ${email}: ${code}\n\nThis code will expire in 15 minutes.`
    );

    return {
      success: true,
      playerId: existingPlayer.id,
      message: `Validation code sent to ${email}`,
    };
  }

  async validateCode(
    email: string,
    code: string
  ): Promise<{ success: boolean; playerId?: string; message: string }> {
    const { data, error } = await this.client
      .from("validation_codes")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("code", code.toUpperCase())
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !data) {
      return {
        success: false,
        message: "Invalid or expired validation code",
      };
    }

    // Mark code as used
    await this.client
      .from("validation_codes")
      .update({ used: true })
      .eq("id", data.id);

    return {
      success: true,
      playerId: data.player_id,
      message: "Email verified successfully",
    };
  }

  async getValidationCodes(): Promise<ValidationCode[]> {
    const { data, error } = await this.client
      .from("validation_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }
}
