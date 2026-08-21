import { ChevronDownIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Field } from "./field";
import { Calendar } from "../ui/calendar";
import { useState } from "react";

/**
 * Format for the hidden input as a plain calendar date.
 *
 * Deliberately NOT `toISOString()`, which converts to UTC first. The calendar
 * hands back local midnight, so through British Summer Time (late March to late
 * October) UTC is still on the previous day — an event picked for 1 October was
 * being submitted as 30 September.
 */
const toISODate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const YEAR = new Date().getFullYear();

/**
 * Which months the calendar can navigate to. Dates of birth are necessarily in
 * the past, but events and deadlines are not — capping every field at the
 * current month left no way to schedule anything.
 */
const RANGES = {
  past: { start: new Date(2000, 0), end: new Date() },
  future: { start: new Date(), end: new Date(YEAR + 10, 11) },
  any: { start: new Date(2000, 0), end: new Date(YEAR + 10, 11) },
};

type DateField = {
  name: string;
  label: string;
  defaultValue?: Date;
  errors?: any;
  range?: keyof typeof RANGES;
};
export const DateField: React.FC<DateField> = ({
  name,
  label,
  defaultValue,
  errors,
  range = "any",
}) => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(defaultValue);
  const { start, end } = RANGES[range];
  return (
    <Field name={name} label={label} errors={errors}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date"
            className="w-full justify-between font-normal text-foreground hover:bg-card border-input"
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
            defaultMonth={date}
            captionLayout="dropdown"
            startMonth={start}
            endMonth={end}
            onSelect={(date) => {
              setDate(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <input type="hidden" name={name} value={date ? toISODate(date) : ""} />
    </Field>
  );
};
