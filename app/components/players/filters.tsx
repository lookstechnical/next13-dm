import { FilterIcon } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "../ui/sheet";
import ActionButton from "../ui/action-button";
import { Form } from "@remix-run/react";
import { Field } from "../forms/field";
import { Input } from "../ui/input";
import { useState } from "react";
import { SelectField } from "../forms/select";
import { PlayerGroup } from "~/types";

type PlayerFilters = {
  appliedFilters: any;
  groups?: PlayerGroup[];
};
export const PlayerFilters: React.FC<PlayerFilters> = ({
  appliedFilters,
  groups,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={(val) => setOpen(val)}>
      <SheetTrigger onClick={() => setOpen(true)}>
        <FilterIcon />
      </SheetTrigger>
      <SheetContent side="left">
        <Form className="gap-4 flex flex-col" onSubmit={() => setOpen(false)}>
          <Field name="name" label="Name">
            <Input
              name="name"
              placeholder="Enter Players Name"
              defaultValue={appliedFilters?.name}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>

          <SelectField
            name="age-group"
            label="Age Group"
            defaultValue={appliedFilters?.ageGroup}
            options={[
              { id: "U14", name: "U14" },
              { id: "U15", name: "U15" },
              { id: "U16", name: "U16" },
            ]}
          />

          {groups && (
            <SelectField
              name="group"
              label="Group"
              defaultValue={appliedFilters?.group}
              options={groups?.map((g) => ({ id: g.id, name: g.name }))}
            />
          )}

          <SheetClose asChild>
            <ActionButton title="Apply Filters" />
          </SheetClose>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
