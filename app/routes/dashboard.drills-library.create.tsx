import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import { DrillForm } from "~/components/forms/form/drill";
import SheetPage from "~/components/sheet-page";
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
  const coachingPoints = formData.get("coachingPoints") as string;

  const data: Omit<Drill, "id"> = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    intensity: formData.get("intensity") as string,
    coachingPoints: coachingPoints.split(","),
    videoUrl: formData.get("videoUrl") as string,
    imageUrl: formData.get("imageUrl") as string,
  };

  console.log({ data });

  const drill = await drillService.addDrill(data);

  const image = formData.get("image");
  if (image) {
    await drillService.uploadDrillImage(image, drill.id);
  }
  const video = formData.get("video");
  if (video) {
    await drillService.uploadDrillVideo(video, drill.id);
  }

  if (categories) {
    await drillService.updateDrillCategories(
      drill.id,
      categories?.split(",") || []
    );
  }

  return redirect(`/dashboard/drills-library`);
};

export default function DrillsCreate() {
  const { categories } = useLoaderData<typeof loader>();

  return (
    <SheetPage
      backLink="/dashboard/drills-library"
      title="Add Drill/Game"
      description="Add a new skill drill or game"
      updateButton="Add drill"
      hasForm
    >
      <DrillForm categories={categories} />
    </SheetPage>
  );
}
