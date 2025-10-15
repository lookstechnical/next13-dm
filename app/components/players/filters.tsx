import { FilterIcon } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "../ui/sheet";
import ActionButton from "../ui/action-button";
import { Form } from "@remix-run/react";
import { Field } from "../forms/field";
import { Input } from "../ui/input";
import { useState } from "react";
import { SelectField } from "../forms/select";
import { PlayerGroup, User } from "~/types";
import { POSITIONS } from "~/utils/helpers";
import { Button } from "../ui/button";

type PlayerFilters = {
  appliedFilters: any;
  groups?: PlayerGroup[];
  mentors: User[];
};
export const PlayerFilters: React.FC<PlayerFilters> = ({
  appliedFilters,
  groups,
  mentors,
}) => {
  const [open, setOpen] = useState(false);

  console.log({ mentors });
  return (
    <Sheet open={open} onOpenChange={(val) => setOpen(val)}>
      <SheetTrigger asChild onClick={() => setOpen(true)}>
        <Button variant="outline">
          <FilterIcon />
        </Button>
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

          {POSITIONS && (
            <SelectField
              name="position"
              label="Position"
              defaultValue={appliedFilters?.position}
              options={POSITIONS?.map((p) => ({ id: p, name: p }))}
            />
          )}

          {mentors && (
            <SelectField
              name="mentor"
              label="Mentor"
              defaultValue={appliedFilters?.mentor}
              options={mentors?.map((p) => ({ id: p.id, name: p.name }))}
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
