import { SelectProps } from "@radix-ui/react-select";

import { SelectField } from "./select";

export const POSITIONS = [
  "Fullback",
  "Winger",
  "Centre",
  "Stand-off",
  "Scrum-half",
  "Prop",
  "Hooker",
  "Second Row",
  "Loose Forward",
];

type PositionSelect = {
  label: string;
  placeholder?: string;
  errors?: any;
} & SelectProps;

export const PositionSelect: React.FC<PositionSelect> = ({
  defaultValue,
  name,
  label,
  placeholder,
  errors,
}) => {
  return (
    <SelectField
      defaultValue={defaultValue}
      name={name}
      label={label}
      placeholder={placeholder}
      errors={errors}
      options={POSITIONS.map((p) => ({ id: p, name: p }))}
    />
  );
};
