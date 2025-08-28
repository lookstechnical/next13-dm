import { PropsWithChildren } from "react";
import { Button } from "../ui/button";
import { InfoIcon } from "lucide-react";
import { Popover, PopoverContent } from "@radix-ui/react-popover";
import { PopoverTrigger } from "../ui/popover";

type Field = PropsWithChildren<{
  label: string;
  name: string;
  tooltip?: string;
  errors?: any;
}>;

export const Field: React.FC<Field> = ({
  label,
  name,
  tooltip,
  children,
  errors,
}) => {
  return (
    <div className="space-y-2 w-full flex flex-col text-foreground">
      <label
        htmlFor={name}
        className="text-sm font-medium text-gray-300 flex flex-row justify-between items-center gap-2"
      >
        {label}
        {tooltip && (
          <Popover defaultOpen={false}>
            <PopoverTrigger asChild tabIndex={-1}>
              <Button
                type="button"
                variant="outline"
                className="w-fit h-fit bg-transparent hover:bg-transparent border-none focus:outline-0 focus:ring-0 user-select-0"
              >
                <InfoIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              className="capitalize p-4 border-muted z-10 bg-wkbackground shadow-sm shadow-background"
            >
              {tooltip}
            </PopoverContent>
          </Popover>
        )}
      </label>
      {children}
      {errors && errors?.properties[name] && (
        <p className="text-sm text-destructive">
          {errors?.properties[name].errors[0]}
        </p>
      )}
    </div>
  );
};
