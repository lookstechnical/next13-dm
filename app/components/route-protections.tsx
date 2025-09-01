import { FC, PropsWithChildren } from "react";
import { User } from "~/types";

type RouteProtectionProps = {
  allowedRoles: string[];
  user: User;
};

export const AllowedRoles = {
  noone: [],
  adminOnly: ["ADMIN"],
  headOfDept: ["HEAD_OF_DEPARTMENT", "ADMIN"],
  coach: ["COACH", "HEAD_OF_DEPARTMENT", "ADMIN"],
  scout: ["SCOUT", "HEAD_OF_DEPARTMENT", "ADMIN"],
  all: ["COACH", "SCOUT", "HEAD_OF_DEPARTMENT", "ADMIN"],
};

export const RouteProtection: FC<PropsWithChildren<RouteProtectionProps>> = ({
  allowedRoles,
  user,
  children,
}) => {
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="w-full flex flex-col items-center justify-center text-foreground min-h-screen">
        <h1>You don't have permissions to do this Please contact your admin</h1>
      </div>
    );
  }

  return children;
};
