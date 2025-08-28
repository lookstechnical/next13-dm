import { Link } from "@remix-run/react";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "../ui/sheet";
import { MenuIcon } from "lucide-react";
import { PropsWithChildren } from "react";
import { User } from "~/types";
import { MobileUserMenu } from "./user-menu";
import { cn } from "~/lib/utils";

type MenuLink = PropsWithChildren<{
  to: string;
  close?: boolean;
  level?: number;
}>;

const MenuLink: React.FC<MenuLink> = ({ children, to, close, level = 0 }) => {
  if (close) {
    return (
      <SheetClose asChild>
        <Link
          className={cn(
            "w-full flex justify-end items-end lg:justify-start lg:w-fit px-3 py-2 lg:text-sm transition-colors text-gray-200 hover:text-gray-900 hover:bg-gray-100",
            level === 2 ? "text-md" : "text-xl"
          )}
          to={to}
          prefetch="intent"
        >
          {children}
        </Link>
      </SheetClose>
    );
  }
  return (
    <Link
      className="lg:items-center w-full lg:w-fit flex items-end px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-200 hover:text-gray-900 hover:bg-gray-100"
      to={to}
    >
      {children}
    </Link>
  );
};

const MenuItems = ({ close }: { close?: boolean }) => {
  return (
    <nav className="flex flex-col lg:flex-row lg:flex  w-full lg:w-fit">
      <MenuLink close={close} to="/dashboard">
        Dashboard
      </MenuLink>
      {/* <MenuLink to="/dashboard/matches">Matches</MenuLink> */}
      <MenuLink close={close} to="/dashboard/players">
        Players
      </MenuLink>
      <MenuLink close={close} to="/dashboard/events">
        Events
      </MenuLink>
      <MenuLink close={close} to="/dashboard/groups" data-discover="true">
        Groups
      </MenuLink>
      <MenuLink
        close={close}
        to="/dashboard/drills-library"
        data-discover="true"
      >
        Drills library
      </MenuLink>
    </nav>
  );
};

const AccountMenuItems = ({ close }: { close?: boolean }) => {
  return (
    <nav className="flex flex-col  w-full">
      <MenuLink close={close} level={2} to="/dashboard/team">
        Team
      </MenuLink>
      <MenuLink close={close} level={2} to="/dashboard/clubs">
        Clubs
      </MenuLink>
      <MenuLink close={close} level={2} to="/dashboard/attributes">
        Attributes
      </MenuLink>
      <MenuLink close={close} level={2} to="/dashboard/templates">
        Templates
      </MenuLink>
    </nav>
  );
};

export const Menu: React.FC<{ className?: string; user?: User }> = ({
  className,
  user,
}) => {
  return (
    <div className={className}>
      <div className="hidden lg:block">
        <MenuItems />
      </div>
      <div className="lg:hidden text-foreground">
        <Sheet>
          <SheetTrigger>
            <MenuIcon />
          </SheetTrigger>
          <SheetContent className="[&>button:last-of-type]:hidden">
            {user && <MobileUserMenu user={user} />}

            <div className="lg:hidden bt-1 border-muted w-full absolute bottom-0 pl-0 p-10">
              <MenuItems close={true} />
              <div className="h-2 w-full bg-wkbackground my-2"></div>
              {user && user.role === "ADMIN" && (
                <AccountMenuItems close={true} />
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
