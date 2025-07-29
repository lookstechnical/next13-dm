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
import { User as UserIcon } from "lucide-react";
import { User } from "~/types";
import { Form, useLocation } from "@remix-run/react";

type UserMenu = {
  user: User;
};
export const UserMenu: React.FC<UserMenu> = ({ user }) => {
  const location = useLocation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-full hover:bg-transparent text-foreground border-none focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <div className="w-[30px] h-[30px] flex items-center justify-center overflow-hidden rounded-full object-cover bg-white">
            {user?.avatar ? (
              <img width={20} height={20} alt={user.name} src={user.avatar} />
            ) : (
              <UserIcon className="text-background" />
            )}
          </div>
          <div className="text-left">
            <div className="text-sm">{user?.name}</div>
            <div className="text-xs">{user?.team.name}</div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Teams</DropdownMenuLabel>
        <DropdownMenuGroup>
          {user.teams.map((team) => (
            <Form
              key={`team-context-switch-${team.id}`}
              method="POST"
              action="/switch-teams"
            >
              <input type="hidden" name="teamId" value={team.id} />
              <input
                type="hidden"
                name="currentUrl"
                value={location.pathname}
              />
              <DropdownMenuItem asChild key={`context-${team.id}`}>
                <button type="submit" className="w-full">
                  {team.name}
                </button>
              </DropdownMenuItem>
            </Form>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Account</DropdownMenuLabel>

        <DropdownMenuGroup>
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Logout</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
