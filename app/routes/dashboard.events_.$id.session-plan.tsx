import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Link, Outlet, redirect, useLoaderData, useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ActionProtection } from "~/components/action-protection";
import { AllowedRoles } from "~/components/route-protections";
import { SessionDownloadButton } from "~/components/session/download-button";
import { SessionItemCard } from "~/components/session/item-card";
import { Button } from "~/components/ui/button";
import { CardGrid } from "~/components/ui/card-grid";
import { EventService } from "~/services/eventService";
import { SessionService } from "~/services/sessionService";
import { SessionItem } from "~/types";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = withAuth(
  async ({ params, supabaseClient, user }) => {
    const eventService = new EventService(supabaseClient);
    const sessionService = new SessionService(supabaseClient);

    const event = await eventService.getEventById(params.id as string);
    const sessionItems = await sessionService.getSessionItemsByEvent(
      params.id as string
    );

    return { event, sessionItems, user };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, params, supabaseClient }) => {
    const sessionService = new SessionService(supabaseClient);
    const formData = await request.formData();

    if (request.method === "DELETE") {
      const id = formData.get("id") as string;
      if (id) sessionService.deleteSessionItemsById(id);
      return redirect(`/dashboard/events/${params.id}/session-plan`);
    }

    if (request.method === "PUT") {
      const itemsJson = formData.get("items") as string;
      if (itemsJson) {
        const items = JSON.parse(itemsJson);
        await sessionService.updateSessionItemsOrder(items);
        return { status: "success" };
      }
    }
  }
);

function SortableSessionItem({
  sessionItem,
  to,
  user,
}: {
  sessionItem: SessionItem;
  to: string;
  user: any;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sessionItem.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <SessionItemCard
        sessionItem={sessionItem}
        to={to}
        user={user}
        dragHandleProps={listeners}
      />
    </div>
  );
}

export default function SessionPlan() {
  const { event, sessionItems: initialItems, user } = useLoaderData<typeof loader>();
  const [sessionItems, setSessionItems] = useState<SessionItem[]>(initialItems || []);
  const fetcher = useFetcher();

  // Sync state when loader data changes
  useEffect(() => {
    setSessionItems(initialItems || []);
  }, [initialItems]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSessionItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);

        // Update the order values and submit to server
        const itemsWithNewOrder = newItems.map((item, index) => ({
          id: item.id,
          order: index,
        }));

        const formData = new FormData();
        formData.append("items", JSON.stringify(itemsWithNewOrder));

        fetcher.submit(formData, {
          method: "PUT",
        });

        return newItems;
      });
    }
  };

  return (
    <>
      <div className="bg-card min-h-screen py-10">
        <div className="container mx-auto px-4">
          <div className="w-full flex flex-row justify-between gap-2">
            <div></div>
            <div className="flex flex-row">
              <SessionDownloadButton sessionItems={sessionItems} />
              <ActionProtection
                allowedRoles={AllowedRoles.headOfDept}
                user={user}
              >
                <Button variant="outline" asChild className="text-white">
                  <Link
                    to={`/dashboard/events/${event.id}/session-plan/add-library-item`}
                  >
                    Add Session Item
                  </Link>
                </Button>
              </ActionProtection>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sessionItems.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <CardGrid
                items={sessionItems}
                name="No session Plan items for this event"
                className="w-full flex flex-col gap-2"
              >
                {sessionItems.map((item: SessionItem) => (
                  <SortableSessionItem
                    key={item.id}
                    sessionItem={item}
                    to={`/dashboard/events/${event.id}/session-plan/${item.id}`}
                    user={user}
                  />
                ))}
              </CardGrid>
            </SortableContext>
          </DndContext>
        </div>
        <Outlet />
      </div>
    </>
  );
}
