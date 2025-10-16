import { Link } from "@remix-run/react";
import { Card } from "../ui/card";
import { Player } from "~/types";
import {
  calculateAgeGroup,
  calculateRelativeAgeQuartile,
} from "~/utils/helpers";
import { cn } from "~/lib/utils";
import {
  Mail,
  MailCheck,
  MailMinus,
  Phone,
  User,
  UserCheck,
} from "lucide-react";
import { PropsWithChildren } from "react";
import { Tooltip, TooltipContent, TooltipProvider } from "../ui/tooltip";
import { TooltipTrigger } from "@radix-ui/react-tooltip";

type PlayerCard = PropsWithChildren<{
  player: Player;
  to?: (playerId: string) => string;
  onSelect?: (playerId: string) => void;
  isSelected?: boolean;
}>;

const getScoreColor = (score: number) => {
  if (score <= 5) {
    return "text-primary";
  }
  if (score > 5 && score < 7) {
    return "text-secondary";
  }

  return "text-success";
};

export const PlayerCard: React.FC<PlayerCard> = ({
  to,
  player,
  children,
  isSelected,
  onSelect,
}) => {
  const link = to && to(player.id);

  const renderContent = () => {
    return (
      <div className="p-6">
        <div className="flex items-center">
          {player.photoUrl ? (
            <img
              width={16}
              height={16}
              alt={player.name}
              className="w-16 h-16 rounded-full object-cover mr-4"
              src={player.photoUrl}
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mr-4">
              <User size={24} className="text-gray-400" />
            </div>
          )}

          <div className="flex-grow">
            <h3 className="text-lg font-semibold text-white">{player?.name}</h3>
            <div className="text-sm text-gray-400">
              {player?.position}
              <span className="text-gray-500">
                {" "}
                • {player?.secondaryPosition}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              <span className="mr-2">{player?.club}</span>
            </div>
            {player?.mentor && (
              <div className="text-xs mt-2  text-gray-200">
                <span className="mr-2 flex flex-row gap-2 items-center">
                  <UserCheck />
                  {player?.mentor?.name}
                </span>
              </div>
            )}
            <div className="flex items-center space-x-2 mt-2">
              <div className="bg-red-600 text-white px-2 py-1 rounded-lg text-xs font-medium">
                {calculateAgeGroup(player?.dateOfBirth)}
              </div>
              <div
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium",
                  calculateRelativeAgeQuartile(player?.dateOfBirth).quartile ===
                    1 && `bg-red-400 text-red`,
                  calculateRelativeAgeQuartile(player?.dateOfBirth).quartile ===
                    2 && `bg-orange-400 text-orange`,
                  calculateRelativeAgeQuartile(player?.dateOfBirth).quartile ===
                    3 && `bg-yellow-400 text-yellow`,
                  calculateRelativeAgeQuartile(player?.dateOfBirth).quartile ===
                    4 && `bg-green-400 text-green`
                )}
                title="Oldest in year group (Sept-Nov births) - potential relative age advantage"
              >
                {calculateRelativeAgeQuartile(player?.dateOfBirth).label}
              </div>
              <div>
                {player?.email && <Mail className="text-white size-3" />}
              </div>
              <div>
                {player?.mobile && <Phone className="text-white size-3" />}
              </div>
            </div>
          </div>
          <div
            className={cn(
              "flex flex-col items-end",
              getScoreColor(Math.round(player.playerAvgScores?.avgOverallScore))
            )}
          >
            {player.playerAvgScores &&
              player.playerAvgScores.avgOverallScore &&
              Math.round(player.playerAvgScores?.avgOverallScore)}
          </div>
          <div>
            {player?.invitations?.[0] &&
              player.invitations[0].status === "pending" && (
                <Mail className="text-foreground" />
              )}

            {player?.invitations?.[0] &&
              player.invitations[0].status === "accepted" && (
                <MailCheck className="text-secondary" />
              )}
            {player?.invitations?.[0] &&
              player.invitations[0].status === "rejected" && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <MailMinus className="text-primary" />
                    </TooltipTrigger>
                    <TooltipContent className="text-foreground">
                      {player.invitations[0].reason
                        ? player.invitations[0].reason
                        : "No Reason given"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
          </div>
        </div>
      </div>
    );
  };

  const handleClick = () => {
    if (onSelect) onSelect(player.id);
  };

  return (
    <Card
      className={cn("border-border relative", isSelected && "bg-wkbackground")}
      onClick={handleClick}
    >
      {link && <Link to={link} className="block transition-all hover:opacity-80 active:opacity-60">{renderContent()}</Link>}
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
