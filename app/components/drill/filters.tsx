import { FilterIcon } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "../ui/sheet";
import ActionButton from "../ui/action-button";
import { Form } from "@remix-run/react";
import { Field } from "../forms/field";
import { Input } from "../ui/input";
import { useState } from "react";
import { SelectField } from "../forms/select";
import { PlayerGroup } from "~/types";
import { POSITIONS } from "~/utils/helpers";
import { Button } from "../ui/button";
import { MultiSelectField } from "../forms/multi-select";

type DrillFilters = {
  appliedFilters: any;
  groups?: PlayerGroup[];
  categories: any[];
};
export const DrillFilters: React.FC<DrillFilters> = ({
  appliedFilters,
  categories,
}) => {
  const [open, setOpen] = useState(false);

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

          <MultiSelectField
            name="categories"
            label="Categories"
            placeholder="Enter Description"
            defaultValue={appliedFilters.categoryFilter?.split(",")}
            options={categories.map((c) => ({ id: c.id, label: c.name }))}
          />

          <SheetClose asChild>
            <ActionButton title="Apply Filters" />
          </SheetClose>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
