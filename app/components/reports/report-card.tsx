import { Link } from "@remix-run/react";
import { Card } from "../ui/card";
import { PlayerReport } from "~/types";
import { cn } from "~/lib/utils";
import { PropsWithChildren } from "react";

type ReportCard = PropsWithChildren<{
  report: PlayerReport;
  to?: (playerId: string) => string;
  onSelect?: (playerId: string) => void;
  isSelected?: boolean;
}>;

export const ReportCard: React.FC<ReportCard> = ({
  to,
  report,
  isSelected,
  onSelect,
}) => {
  const link = to && to(report.id);

  const getScoreColor = (score: number) => {
    if (score <= 5) {
      return "text-primary";
    }
    if (score > 5 && score < 7) {
      return "text-secondary";
    }

    return "text-success";
  };

  const renderContent = () => {
    return (
      <div className="flex- flex-col">
        <div className="bg-primary text-md p-2 text-white">
          {report?.events?.name}
        </div>
        <div className="p-6 text-foreground flex flex-row justify-between">
          {report.reportScores.map((rs) => (
            <div className="flex flex-col items-center justify-center">
              <div className="text-muted text-sm">
                {rs.reportAttributes.name}
              </div>
              <div className={cn("text-lg", getScoreColor(rs.score))}>
                {rs.score}
              </div>
            </div>
          ))}
        </div>
        <div className="text-muted text-sm p-6 flex -flex-row justify-between items-center">
          <div>{report.notes}</div>{" "}
          <div className="p-6 text-muted text-xs">{report.users.name}</div>
        </div>
      </div>
    );
  };

  const handleClick = () => {
    if (onSelect) onSelect(report.id);
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
