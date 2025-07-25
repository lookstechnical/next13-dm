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
        <img src="/logo.png" width={30} height={30} />
        <Menu />
        <div>
          <UserMenu user={user} />
          {user.role === "ADMIN" && <AccountMenu />}
        </div>
      </div>
    </header>
  );
};
