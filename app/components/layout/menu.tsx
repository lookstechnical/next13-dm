import { Link } from "@remix-run/react";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "../ui/sheet";
import { MenuIcon } from "lucide-react";
import { PropsWithChildren } from "react";
import { User } from "~/types";

type MenuLink = PropsWithChildren<{ to: string; close?: boolean }>;

const MenuLink: React.FC<MenuLink> = ({ children, to, close }) => {
  if (close) {
    return (
      <SheetClose asChild>
        <Link
          className=" w-full flex justify-end items-end px-3 py-2 text-md font-medium transition-colors text-gray-200 hover:text-gray-900 hover:bg-gray-100"
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
    </nav>
  );
};

const AccountMenuItems = ({ close }: { close?: boolean }) => {
  return (
    <nav className="flex flex-col lg:flex-row lg:flex   w-full lg:w-fit">
      <h2 className="text-xl text-foreground">Admin</h2>
      <MenuLink close={close} to="/dashboard/team">
        Team
      </MenuLink>
      <MenuLink close={close} to="/dashboard/clubs">
        Clubs
      </MenuLink>
      <MenuLink close={close} to="/dashboard/attributes">
        Attributes
      </MenuLink>
      <MenuLink close={close} to="/dashboard/templates">
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
          <SheetContent>
            <MenuItems close={true} />

            <div className="lg:hidden bt-1 border-muted fixed bottom-0">
              {/* {user && <UserMenu user={user} />} */}
              {user && user.role === "ADMIN" && <AccountMenuItems />}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
