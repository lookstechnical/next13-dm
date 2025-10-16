import { Link } from "@remix-run/react";
import { Card } from "../ui/card";
import { PlayerGroup } from "~/types";
import { formatDate } from "~/utils/helpers";
import { Users2Icon } from "lucide-react";
import { Badge } from "../ui/badge";
import { cn } from "~/lib/utils";

type GroupCard = {
  group: PlayerGroup;
  to?: (playerId: string) => string;
  onSelect?: (playerId: string) => void;
  isSelected?: boolean;
};

export const GroupCard: React.FC<GroupCard> = ({
  to,
  group,
  isSelected,
  onSelect,
}) => {
  const link = to && to(group.id);

  const handleClick = () => {
    if (onSelect) onSelect(group.id);
  };

  const renderContent = () => {
    return (
      <div className="p-6">
        <div className="flex  flex-row justify-between w-full">
          <div className="flex-grow gap-4 flex flex-col">
            <h3 className="text-lg font-semibold text-white">{group?.name}</h3>
            <p className="text-sm flex flex-row gap-2 text-muted">
              {group.description}
            </p>
            <p className="text-xs flex flex-row gap-2 text-muted">
              <Users2Icon className="w-4 h-4" />
              {group.player_group_members?.length} Players
            </p>
          </div>
          <div className="flex flex-col">
            <Badge variant="outline" className="text-xs uppercase">
              {group.type}
            </Badge>
          </div>
        </div>
      </div>
    );
  };
  return (
    <Card
      className={cn("border-border relative", isSelected && "bg-wkbackground")}
      onClick={handleClick}
    >
      {link && <Link to={link} className="block transition-all hover:opacity-80 active:opacity-60">{renderContent()}</Link>}
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
