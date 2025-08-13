import { SelectProps } from "@radix-ui/react-select";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Field } from "./field";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetOverlay,
  SheetTrigger,
} from "../ui/sheet";
import { useState } from "react";
import { Button } from "../ui/button";

type SelectField = {
  options: { id: string; name: string }[];
  label: string;
  placeholder?: string;
} & SelectProps;

export const SelectField: React.FC<SelectField> = ({
  defaultValue,
  name,
  label,
  options,
  placeholder,
  ...rest
}) => {
  const [value, setValue] = useState(defaultValue);

  return (
    <Field name={name as string} label={label}>
      <input type="hidden" name={name} value={value} />
      <div className="block md:hidden w-full">
        <Sheet>
          <SheetTrigger className="w-full">
            <Button
              type="button"
              variant="outline"
              className="w-full text-foreground border-muted"
            >
              {value || placeholder || label}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[40vh] overflow-scroll p-4"
          >
            {options.map((p) => (
              <SheetClose className=" text-foreground w-full">
                <Button
                  type="button"
                  variant="outline"
                  key={`select-option-${p.id}`}
                  className=" text-foreground w-full"
                  onClick={() => setValue(p.id)}
                >
                  {p.name}
                </Button>
              </SheetClose>
            ))}
          </SheetContent>
        </Sheet>
      </div>
      <div className="hidden md:block w-full">
        <Select
          defaultValue={defaultValue}
          {...rest}
          value={value}
          onValueChange={(val) => setValue(val)}
        >
          <SelectTrigger className="w-full text-foreground border-muted">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="text-foreground">
            <SelectGroup>
              <SelectLabel className=" text-foreground">{label}</SelectLabel>
              {options.map((p) => (
                <SelectItem
                  key={`select-option-${p.id}`}
                  className=" text-foreground"
                  value={p.id}
                >
                  {p.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </Field>
  );
};
