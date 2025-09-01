import { FC, PropsWithChildren } from "react";
import { User } from "~/types";

type ActionProtectionProps = {
  allowedRoles: string[];
  user: User;
};

export const ActionProtection: FC<PropsWithChildren<ActionProtectionProps>> = ({
  allowedRoles,
  user,
  children,
}) => {
  if (!allowedRoles.includes(user.role)) {
    return null;
  }

  return children;
};
