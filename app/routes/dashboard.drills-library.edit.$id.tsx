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
import { withAuth, withAuthAction } from "~/utils/auth-helpers";
import { getAppUser, requireUser } from "~/utils/require-user";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = withAuth(
  async ({ params, supabaseClient }) => {
    const drillService = new DrillsService(supabaseClient);
    const categories = await drillService.getAllDrillCategories();

    const drill = params.id
      ? await drillService.getDrillById(params.id)
      : undefined;

    return { categories, drill };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, params, supabaseClient }) => {
    let formData = await request.formData();

    if (params.id) {
      const drillService = new DrillsService(supabaseClient);

      const categories = formData.get("categories") as string;
      const coachingPoints = formData.get("coachingPoints") as string;

      const data: Omit<Drill, "id"> = {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        coaching_points: coachingPoints.split(","),
        intensity: formData.get("intensity") as string,
        video_url: formData.get("videoUrl") as string,
        image_url: formData.get("imageUrl") as string,
      };

      const drill = await drillService.updateDrill(params.id, data);

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
    }

    return redirect(`/dashboard/drills-library`);
  }
);

export default function DrillEdit() {
  const { categories, drill } = useLoaderData<typeof loader>();

  return (
    <SheetPage
      backLink="/dashboard/drills-library"
      title="Add Drill/Game"
      description="Add a new skill drill or game"
      updateButton="Update drill"
      hasForm
    >
      <DrillForm drill={drill} categories={categories} />
    </SheetPage>
  );
}
