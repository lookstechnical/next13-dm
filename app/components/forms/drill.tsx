import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "../ui/sheet";
import { Field } from "./field";
import { useFetcher } from "@remix-run/react";
import { DrillCard } from "../drill/drill-card";
import { Drill } from "~/types";
import { Input } from "../ui/input";
import { MultiSelectField } from "./multi-select";
import { Search } from "lucide-react";

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
                Select a Drill
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
            <div className="flex mb-4 z-10">
              <fetcher.Form method="get" action="/dashboard/drills-library">
                <div className="w-full flex flex-row gap-4 items-end">
                  <Field name="name" label="Name">
                    <Input name="name" placeholder="filter by name" />
                  </Field>
                  <MultiSelectField
                    name="categories"
                    label="Categories"
                    placeholder="filter by category"
                    options={fetcher?.data?.categories?.map((c) => ({
                      id: c.id,
                      label: c.name,
                    }))}
                    onChange={() => {}}
                  />
                  <Button variant="outline" className="text-foreground">
                    <Search />
                  </Button>
                </div>
              </fetcher.Form>
            </div>
            <div className="flex flex-col gap-4">
              {fetcher?.data?.drills?.map((drill) => (
                <SheetClose key={drill.id} className="w-full">
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
