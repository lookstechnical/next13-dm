import { MoreVertical } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { PropsWithChildren } from "react";

type MoreActions = PropsWithChildren<{}>;

export const MoreActions: React.FC<MoreActions> = ({ children }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex flex-row">
        <Button variant="outline" className="border-muted text-foreground">
          Actions
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
};
