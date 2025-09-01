import type { MetaFunction } from "@remix-run/node";
import SheetPage from "~/components/sheet-page";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export default function PlayersCreate() {
  return (
    <SheetPage
      backLink="/dashboard/players"
      title="Add Match"
      description="Add Match"
    ></SheetPage>
  );
}
