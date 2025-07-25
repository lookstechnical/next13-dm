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
  return (
    <Field name={name as string} label={label}>
      <Select defaultValue={defaultValue} name={name} {...rest}>
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
    </Field>
  );
};
