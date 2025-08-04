import { FilterIcon } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "../ui/sheet";
import ActionButton from "../ui/action-button";
import { Form } from "@remix-run/react";
import { Field } from "../forms/field";
import { Input } from "../ui/input";
import { useState } from "react";

export const PlayerFilters = () => {
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
              defaultValue=""
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>

          {/* <Field name="quartile" label="">
            <Input
              name="name"
              placeholder="Enter Players Name"
              defaultValue=""
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field> */}

          <SheetClose asChild>
            <ActionButton title="Apply Filters" />
          </SheetClose>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
