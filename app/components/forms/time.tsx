import { Input } from "../ui/input";
import { Field } from "./field";

/**
 * A native `<input type="time">`, which gives us the platform's own time picker
 * (including the 12/24-hour format the user's device is set to) and submits a
 * plain 24-hour "HH:MM" string — exactly what a Postgres `time` column takes.
 *
 * No Popover/Calendar equivalent of DateField is needed here: unlike a date,
 * there is nothing to navigate and nothing to convert, so wrapping it would add
 * a timezone round-trip for no gain.
 */
type TimeField = {
  name: string;
  label: string;
  /** Stored value, e.g. "18:30:00" — trimmed to "HH:MM" for the input. */
  defaultValue?: string | null;
  errors?: any;
};

export const TimeField: React.FC<TimeField> = ({
  name,
  label,
  defaultValue,
  errors,
}) => {
  return (
    <Field name={name} label={label} errors={errors}>
      <Input
        name={name}
        type="time"
        defaultValue={defaultValue ? defaultValue.slice(0, 5) : ""}
        className="bg-card border-gray-600 text-white placeholder:text-gray-400"
      />
    </Field>
  );
};
