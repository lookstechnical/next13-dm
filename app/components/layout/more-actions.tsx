import { MoreVertical } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { PropsWithChildren } from "react";

type MoreActions = PropsWithChildren<{
  title?: string;
}>;

export const MoreActions: React.FC<MoreActions> = ({ children, title }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex flex-row">
        <Button variant="outline" className="border-input text-foreground">
          {title}
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
};
