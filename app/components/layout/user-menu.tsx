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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";

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
            <div className="text-xs">{user?.team?.name}</div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Teams</DropdownMenuLabel>
        <DropdownMenuGroup>
          {user?.teams?.map((team) => (
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
                  {team?.name}
                </button>
              </DropdownMenuItem>
            </Form>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Account</DropdownMenuLabel>

        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Form className="w-full" method="post" action="/logout">
              <button className="w-full text-left">Logout</button>
            </Form>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

type MobileUserMenu = {
  user: User;
};
export const MobileUserMenu: React.FC<UserMenu> = ({ user }) => {
  const location = useLocation();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="w-full bg-transparent text-foreground flex justify-between hover:bg-white hover:text-background p-8 mb-2"
        >
          <div className="w-[30px] h-[30px] flex items-center justify-center overflow-hidden rounded-full object-cover bg-white">
            {user?.avatar ? (
              <img width={20} height={20} alt={user.name} src={user.avatar} />
            ) : (
              <UserIcon className="text-background" />
            )}
          </div>
          <div className="text-left">
            <div className="text-xl">{user?.name}</div>
            <div className="text-md">{user?.team?.name}</div>
          </div>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="w-full text-foreground">
        <SheetTitle>Switch Teams</SheetTitle>
        <div>
          {user?.teams?.map((team) => (
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
              <SheetClose asChild key={`context-${team.id}`}>
                <button type="submit" className="w-full">
                  {team?.name}
                </button>
              </SheetClose>
            </Form>
          ))}
        </div>
        <h2>Account</h2>
        <div>
          <Form
            className="w-full flex items-end"
            method="post"
            action="/logout"
          >
            <SheetClose asChild>
              <button className="w-full text-left text-sm">Logout</button>
            </SheetClose>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
};
