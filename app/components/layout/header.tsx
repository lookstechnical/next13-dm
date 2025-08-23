import { User } from "~/types";
import { AccountMenu } from "./account-menu";
import { Menu } from "./menu";
import { UserMenu } from "./user-menu";

type Header = {
  user: User;
};
export const Header: React.FC<Header> = ({ user }) => {
  return (
    <header className="min-h-[80px] flex flex-row items-center">
      <div className="flex flex-row items-center container px-4 mx-auto  justify-between">
        <div className="text-md text-white rounded-full  flex justify-center items-center">
          <img src="/logo.png" width={30} height={30} className="pr-2" />
          <h1>
            <span className="text-light text-xs">be</span>
            <strong>Coachable</strong>
          </h1>
        </div>
        <Menu user={user} />
        <div className="hidden lg:block">
          <UserMenu user={user} />
          {user.role === "ADMIN" && <AccountMenu />}
        </div>
      </div>
    </header>
  );
};
