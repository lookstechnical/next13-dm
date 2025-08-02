import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import {
  Form,
  Link,
  redirect,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";
import { useState } from "react";
import { EventForm } from "~/components/forms/form/event";
import ActionButton from "~/components/ui/action-button";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { getSupabaseServerClient } from "~/lib/supabase";
import { EventService } from "~/services/eventService";
import { TemplateService } from "~/services/templateService";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const { supabaseClient } = getSupabaseServerClient(request);

  const templateService = new TemplateService(supabaseClient);
  const templates = await templateService.getAllTemplates();

  return { templates };
};

export const action: ActionFunction = async ({ request }) => {
  const { supabaseClient } = getSupabaseServerClient(request);
  const eventsService = new EventService(supabaseClient);

  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }

  let formData = await request.formData();
  const name = formData.get("name") as string;
  const date = formData.get("date") as string;
  const location = formData.get("location") as string;
  const registrationDeadline = formData.get("registrationDeadline") as string;
  const description = formData.get("description") as string;
  const templateId = formData.get("templateId") as string;

  const data = {
    name,
    date,
    location,
    description,
    registrationDeadline,
    teamId: user.current_team,
    status: "upcoming",
    ageGroup: "non",
    templateId: templateId,
  };

  await eventsService.createEvent(data, user.id);

  return redirect("/dashboard/events");
};

export default function AddEvent() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const { templates } = useLoaderData<typeof loader>();

  return (
    <Sheet
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setOpen(open);
          setTimeout(() => {
            navigate(`/dashboard/events`);
          }, 500);
        }
      }}
    >
      <SheetContent className="w-full lg:w-2/3 sm:max-w-[100vw]">
        <SheetHeader className="">
          <SheetTitle>Add Event</SheetTitle>
          <SheetDescription>Add an Event</SheetDescription>
        </SheetHeader>
        <Form method="post">
          <div className="h-[80vh] overflow-scroll">
            <EventForm templates={templates} />
          </div>
          <SheetFooter className="absolute bottom-0 w-full p-10 flex flex-row gap-2">
            <Button asChild variant="link">
              <Link to={`/dashboard/events`}>Cancel</Link>
            </Button>
            <ActionButton title="Add Event" />
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
