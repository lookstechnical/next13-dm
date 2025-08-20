import { Link } from "@remix-run/react";
import { Card } from "../ui/card";
import { Attribute } from "~/types";
import { cn } from "~/lib/utils";
import { PropsWithChildren } from "react";

type AttributeCard = PropsWithChildren<{
  attribute: Attribute;
  to?: (playerId: string) => string;
  onSelect?: (playerId: string) => void;
  isSelected?: boolean;
}>;

export const AttributeCard: React.FC<AttributeCard> = ({
  to,
  attribute,
  children,
  isSelected,
  onSelect,
}) => {
  const link = to && to(attribute.id);

  const renderContent = () => {
    return (
      <div className="p-6">
        <h3 className="text-lg font-semibold text-white">{attribute?.name}</h3>
        <h3 className="text-md font-semibold text-muted capitalize">
          {attribute?.category}
        </h3>
      </div>
    );
  };

  const handleClick = () => {
    if (onSelect) onSelect(attribute.id);
  };

  return (
    <Card
      className={cn("border-border relative", isSelected && "bg-wkbackground")}
      onClick={handleClick}
    >
      {link && <Link to={link}>{renderContent()}</Link>}
      {!link && renderContent()}
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
