import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "../ui/sheet";
import { Field } from "./field";
import { useFetcher } from "@remix-run/react";
import { DrillCard } from "../drill/drill-card";
import { Drill } from "~/types";

export const DrillField = () => {
  const [drill, setDrill] = useState<Drill>();
  const fetcher = useFetcher();

  useEffect(() => {
    fetcher.load("/dashboard/drills-library");
  }, []);

  return (
    <>
      <Field name="drill" label="Drill">
        <input type="hidden" name="drillId" value={drill?.id} />

        <Sheet>
          {!drill && (
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="bg-background text-muted hover:text-white hover:bg-wkbackground text-left justify-start border-muted"
              >
                Select a drill
              </Button>
            </SheetTrigger>
          )}

          {drill && (
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="bg-background p-4 w-full min-h-20 h-fit text-white hover:bg-wkbackground text-left justify-start border-muted"
              >
                <DrillCard drill={drill} />
              </Button>
            </SheetTrigger>
          )}
          <SheetContent className="w-full lg:w-1/2 sm:max-w-[100vw]">
            <div className="flex flex-col gap-4">
              {fetcher?.data?.drills?.map((drill) => (
                <SheetClose className="w-full">
                  <DrillCard drill={drill} onSelect={(id) => setDrill(id)} />
                </SheetClose>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </Field>
    </>
  );
};
