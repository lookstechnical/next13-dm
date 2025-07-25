import { Link } from "@remix-run/react";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { MenuIcon } from "lucide-react";
import { PropsWithChildren } from "react";

type MenuLink = PropsWithChildren<{ to: string }>;

const MenuLink: React.FC<MenuLink> = ({ children, to }) => {
  return (
    <Link
      className="flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-200 hover:text-gray-900 hover:bg-gray-100"
      to={to}
    >
      {children}
    </Link>
  );
};

const MenuItems = () => {
  return (
    <nav className="flex flex-col lg:flex-row lg:flex space-x-6 px-5">
      <MenuLink to="/dashboard">Dashboard</MenuLink>
      {/* <MenuLink to="/dashboard/matches">Matches</MenuLink> */}
      <MenuLink to="/dashboard/players">Players</MenuLink>
      <MenuLink to="/dashboard/events">Events</MenuLink>
      <MenuLink to="/dashboard/groups" data-discover="true">
        Groups
      </MenuLink>
    </nav>
  );
};

export const Menu: React.FC<{ className?: string }> = ({ className }) => {
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
            <MenuItems />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
