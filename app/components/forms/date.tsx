import { ChevronDownIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Field } from "./field";
import { Calendar } from "../ui/calendar";
import { useState } from "react";

type DateField = {
  name: string;
  label: string;
  defaultValue?: Date;
};
export const DateField: React.FC<DateField> = ({
  name,
  label,
  defaultValue,
}) => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(defaultValue);
  return (
    <Field name={name} label={label}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date"
            className="w-full justify-between font-normal text-foreground hover:bg-card border-muted"
          >
            {date ? date.toLocaleDateString() : "Select date"}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto overflow-hidden p-0 text-foreground"
          align="start"
        >
          <Calendar
            mode="single"
            selected={date}
            month={date}
            captionLayout="dropdown"
            onSelect={(date) => {
              setDate(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <input
        type="hidden"
        name={name}
        value={date?.toISOString().split("T")[0]}
      />
    </Field>
  );
};
