import { SessionItem, User } from "~/types";
import { convertKeysToCamelCase } from "../utils/helpers";

export class SessionService {
  client;
  constructor(client: any) {
    this.client = client;
  }

  async addSessionItem(sessionData: Omit<SessionItem, "id" | "eventId">) {
    const { data, error } = await this.client
      .from("session_items")
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      console.log(error);
      throw error;
    }
    return convertKeysToCamelCase(data);
  }

  async updateSessionItem(sessionData: SessionItem, sessionItemId: string) {
    const { data, error } = await this.client
      .from("session_items")
      .update(sessionData)
      .eq("id", sessionItemId)
      .select()
      .single();

    return convertKeysToCamelCase(data);
  }

  async getSessionItemsByEvent(eventId: string) {
    const { data, error } = await this.client
      .from("session_items")
      .select("*, drills(*)")
      .eq("event_id", eventId)
      .order("order");

    if (error) {
      console.log(error);
      throw error;
    }

    // Convert and fetch user names for assigned_to IDs
    const items = convertKeysToCamelCase(data);

    if (items && items.length > 0) {
      for (const item of items) {
        if (Array.isArray(item.assignedTo)) {
          const { data: users } = await this.client
            .from("users")
            .select("id, name")
            .in("id", item.assignedTo);

          if (users) {
            // Create a map of ID to name
            const userMap = new Map(users.map((u: any) => [u.id, u.name]));
            // Replace IDs with names
            item.assignedToNames = item.assignedTo.map((id: string) => userMap.get(id) || id);
          }
        }
      }
    }

    return items;
  }

  async getSessionItemsById(itemId: string) {
    const { data, error } = await this.client
      .from("session_items")
      .select("*, drills(*, categories(*))")
      .eq("id", itemId)
      .single();

    if (error) {
      console.log(error);
      throw error;
    }

    if (data?.drills?.image_url) {
      const { data: imageData, error: imageError } = await this.client.storage
        .from("drill-images")
        .createSignedUrl(data?.drills?.image_url, 30);

      data.drills = { ...data.drills, image_url: imageData?.signedUrl };

      if (imageError) {
        console.log({ error: imageError });
      }
    }

    if (data?.drills?.video_url) {
      const { data: videoData, error: videoError } = await this.client.storage
        .from("drill-images")
        .createSignedUrl(data?.drills?.video_url, 30);

      data.drills = { ...data.drills, video_url: videoData?.signedUrl };

      if (videoError) {
        console.log({ error: videoError });
      }
    }

    return convertKeysToCamelCase(data);
  }

  async deleteSessionItemsById(itemId: string) {
    const { data, error } = await this.client
      .from("session_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      console.log(error);
    }
    return { status: "success" };
  }

  async addSessionReflection(reflection: any) {
    const { data, error } = await this.client
      .from("session_reflection")
      .insert(reflection)
      .select()
      .single();

    if (error) {
      console.log(error);
    }
    return convertKeysToCamelCase(data);
  }

  async addSessionReflectionComments(reflectionId: string, reflection: any) {
    const { data, error } = await this.client
      .from("comments")
      .insert({
        session_reflection_id: reflectionId,
        ...reflection,
      })
      .select()
      .single();

    if (error) {
      console.log(error);
    }
    return convertKeysToCamelCase(data);
  }

  async getReflectionsById(eventId: string, user?: User) {
    const query = this.client
      .from("session_reflection")
      .select("*, users(name), comments(*, users(name))")
      .eq("event_id", eventId);

    if (user) {
      if (user.role !== "HEAD_OF_DEPARTMENT" && user.role !== "ADMIN") {
        query.eq("coach_id", user.id);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.log(error);
    }
    return convertKeysToCamelCase(data);
  }

  async updateSessionItemsOrder(
    items: Array<{ id: string; order: number }>
  ) {
    const updates = items.map((item) =>
      this.client
        .from("session_items")
        .update({ order: item.order })
        .eq("id", item.id)
    );

    const results = await Promise.all(updates);

    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.log("Errors updating order:", errors);
      throw new Error("Failed to update some items");
    }

    return { status: "success" };
  }
}
