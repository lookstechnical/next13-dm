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
import { DrillForm } from "~/components/forms/form/drill";
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
import { DrillsService } from "~/services/drillsService";
import { Drill } from "~/types";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = async ({ request }) => {
  const { supabaseClient } = await getSupabaseServerClient(request);

  return {};
};

export const action: ActionFunction = async ({ request }) => {
  const { supabaseClient } = await getSupabaseServerClient(request);

  let formData = await request.formData();
  const { user: authUser } = await requireUser(supabaseClient);
  const user = await getAppUser(authUser.id, supabaseClient);

  if (!user) {
    return redirect("/");
  }

  const drillService = new DrillsService(supabaseClient);

  const categories = formData.get("imageUrl");

  const data: Omit<Drill, "id"> = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    intensity: formData.get("intensity") as string,
    videoUrl: formData.get("videoUrl") as string,
    imageUrl: formData.get("imageUrl") as string,
  };

  await drillService.addDrill(data);

  return redirect(`/dashboard/drills-library`);
};

export default function DrillsCreate() {
  const navigate = useNavigate();
  const {} = useLoaderData<typeof loader>();

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          navigate("/dashboard/drills-library");
        }
      }}
    >
      <SheetContent className="w-full lg:w-2/3 sm:max-w-[100vw] gap-10 flex flex-col">
        <Form method="post" encType="multipart/form-data">
          <SheetHeader className="">
            <SheetTitle>Add Drill, Skill or Game</SheetTitle>
            <SheetDescription>Add Drill, Skill or Game</SheetDescription>
          </SheetHeader>
          <div className="h-[80vh] overflow-scroll p-4 pb-20">
            <DrillForm />
          </div>
          <SheetFooter className="absolute bottom-0 w-full pb-10 pt-2 px-10 flex flex-row gap-2 bg-background">
            <Button asChild variant="link">
              <Link to={`/dashboard/drills-library`}>Cancel</Link>
            </Button>

            <ActionButton title="Add Drill" />
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
