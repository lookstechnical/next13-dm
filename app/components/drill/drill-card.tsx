import { Link } from "@remix-run/react";
import { Card } from "../ui/card";
import { Drill } from "~/types";
import { cn } from "~/lib/utils";
import { User, Volleyball } from "lucide-react";
import { PropsWithChildren } from "react";
import { Badge } from "../ui/badge";

type DrillCard = PropsWithChildren<{
  drill: Drill;
  to?: (playerId: string) => string;
  onSelect?: (drill: Drill) => void;
  isSelected?: boolean;
}>;

export const DrillCard: React.FC<DrillCard> = ({
  to,
  drill,
  children,
  isSelected,
  onSelect,
}) => {
  const link = to && to(drill.id);

  const renderContent = () => {
    return (
      <div className="p-6">
        <div className="flex items-center">
          {/* {drill.imageUrl ? (
            <img
              width={16}
              height={16}
              alt={drill.name}
              className="w-20 h-16 object-cover mr-4"
              src={drill.imageUrl}
            />
          ) : ( */}
          <div className="w-20 h-16  bg-wkbackground flex items-center justify-center mr-4">
            <Volleyball size={24} className="text-gray-400" />
          </div>
          {/* )} */}

          <div className="flex-grow">
            <h3 className="text-lg font-semibold text-white">{drill?.name}</h3>
            <div className="text-sm text-gray-400">{drill?.intensity}</div>
          </div>
        </div>
        <div className="flex flex-row gap-2 pt-4">
          {drill?.categories?.map((c) => (
            <Badge variant="outline" className="rounded-lg">
              {c.name}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  const handleClick = () => {
    if (onSelect) onSelect(drill);
  };

  return (
    <Card
      className={cn(
        "border-border relative w-full",
        isSelected && "bg-wkbackground"
      )}
      onClick={handleClick}
    >
      {link && <Link to={link}>{renderContent()}</Link>}
      {!link && renderContent()}
      {children && (
        <div className="mt-10 text-foreground">
          <div className="absolute bottom-0 mt-10 w-full">{children}</div>
        </div>
      )}
      {onSelect && (
        <div className="flex flex-row justify-end p-4 absolute bottom-0 mt-10 w-full">
          <div
            className={cn(
              "rounded-full w-3 h-3 bg-white",
              isSelected && "bg-secondary"
            )}
          ></div>
        </div>
      )}
    </Card>
  );
};
