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

type PositionSelect = {} & SelectProps;

export const PositionSelect: React.FC<PositionSelect> = ({
  defaultValue,
  name,
}) => {
  return (
    <Select defaultValue={defaultValue} name={name}>
      <SelectTrigger className="w-full text-foreground border-muted">
        <SelectValue placeholder="Select a Position" />
      </SelectTrigger>
      <SelectContent className="text-foreground">
        <SelectGroup>
          <SelectLabel className=" text-foreground">Position</SelectLabel>
          {POSITIONS.map((p) => (
            <SelectItem
              key={`select-option-${p}`}
              className=" text-foreground"
              value={p}
            >
              {p}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
