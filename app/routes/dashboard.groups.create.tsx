import type { MetaFunction } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";

export const meta: MetaFunction = () => {
  return [
    { title: "Add Event" },
    { name: "description", content: "Add Event" },
  ];
};

export default function PlayersCreate() {
  const navigate = useNavigate();
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          navigate("/dashboard/players");
        }
      }}
    >
      <SheetContent className="w-full lg:w-2/3 sm:max-w-[100vw]">
        <SheetHeader className="">
          <SheetTitle>Add Group</SheetTitle>
          <SheetDescription>Add a player</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
