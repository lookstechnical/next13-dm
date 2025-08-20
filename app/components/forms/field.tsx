import { PropsWithChildren } from "react";
import {
  TooltipTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
} from "../ui/tooltip";
import { Button } from "../ui/button";
import { InfoIcon } from "lucide-react";

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
    <div className="space-y-2 w-full flex flex-col">
      <label
        htmlFor={name}
        className="text-sm font-medium text-gray-300 flex flex-row justify-between items-center gap-2"
      >
        {label}
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-fit h-fit bg-transparent hover:bg-transparent border-none focus:outline-0 focus:ring-0"
                >
                  <InfoIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="capitalize">{tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
