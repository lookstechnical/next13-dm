import { PropsWithChildren } from "react";
import { Card } from "./card";

type CardGrid = PropsWithChildren<{
  items: any[];
  name: string;
}>;

export const CardGrid: React.FC<CardGrid> = ({ children, items, name }) => {
  if (items.length === 0) {
    return (
      <div className="w-full flex items-center justify-center text-foreground">
        <Card className="w-full md:w-1/2 flex items-center justify-center p-10">
          <h2>{name}</h2>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-10">
      {children}
    </div>
  );
};
