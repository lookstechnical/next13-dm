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

  const drillService = new DrillsService(supabaseClient);
  const categories = await drillService.getAllDrillCategories();

  return { categories };
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

  const categories = formData.get("categories") as string;

  const data: Omit<Drill, "id"> = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    intensity: formData.get("intensity") as string,
    videoUrl: formData.get("videoUrl") as string,
    imageUrl: formData.get("imageUrl") as string,
  };

  const drill = await drillService.addDrill(data);

  const image = formData.get("image");
  if (image) {
    await drillService.uploadDrillImage(image, drill.id);
  }
  const video = formData.get("video");
  if (video) {
    await drillService.uploadDrillImage(video, drill.id);
  }

  if (categories) {
    console.log({ categories });
    await drillService.updateDrillCategories(
      drill.id,
      categories?.split(",") || []
    );
  }

  return redirect(`/dashboard/drills-library`);
};

export default function DrillsCreate() {
  const navigate = useNavigate();
  const { categories } = useLoaderData<typeof loader>();

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
            <DrillForm categories={categories} />
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
