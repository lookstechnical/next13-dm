import { PropsWithChildren } from "react";
import { Header } from "./header";

export const Authenticated: React.FC<PropsWithChildren<{ user: any }>> = ({
  children,
  user,
}) => {
  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <Header user={user} />
      <div className="min-h-screen h-full w-full bg-wkbackground">
        {children}
      </div>
    </div>
  );
};
