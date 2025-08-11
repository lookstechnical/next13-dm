import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { MoreVertical, User } from "lucide-react";
import { Link } from "@remix-run/react";

type AccountMenu = {
  player?: any;
};
export const AccountMenu: React.FC<AccountMenu> = ({ player }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-full hover:bg-transparent text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 mt-5">
        <DropdownMenuLabel>Admin Management</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Link className="w-full" to="/dashboard/team" prefetch="intent">
              Team
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link className="w-full" to="/dashboard/clubs" prefetch="intent">
              Clubs
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              className="w-full"
              to="/dashboard/attributes"
              prefetch="intent"
            >
              Attributes
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              className="w-full"
              to="/dashboard/templates"
              prefetch="intent"
            >
              Templates
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
