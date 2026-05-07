import { Link } from "@remix-run/react";
import { Card } from "../ui/card";
import { Programme } from "~/types";
import { formatDate } from "~/utils/helpers";
import { Badge } from "../ui/badge";
import { Calendar, Users } from "lucide-react";

type ProgrammeCardProps = {
  programme: Programme;
  to?: (id: string) => string;
  eventCount?: number;
};

export const ProgrammeCard: React.FC<ProgrammeCardProps> = ({
  to,
  programme,
  eventCount,
}) => {
  const link = to ? to(programme.id) : undefined;

  const renderContent = () => {
    return (
      <div className="p-6">
        {programme.imageUrl && (
          <img
            src={programme.imageUrl}
            alt={programme.name}
            className="w-full aspect-video object-cover object-top rounded-md mb-4"
          />
        )}
        <div className="flex">
          <div className="flex-grow">
            <h3 className="text-lg font-semibold text-white">
              {programme.name}
            </h3>
            {programme.registrationDeadline && (
              <p className="text-sm flex flex-row gap-2 items-center text-muted">
                <Calendar className="w-4" />
                Deadline: {formatDate(programme.registrationDeadline)}
              </p>
            )}
            {eventCount !== undefined && (
              <p className="text-sm text-muted flex flex-row gap-2 items-center mt-1">
                <Users className="w-4" />
                {eventCount} event{eventCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end">
            <Badge variant="outline" className="uppercase text-xs">
              {programme.status}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border">
      {link && (
        <Link
          to={link}
          className="block transition-all hover:opacity-80 active:opacity-60"
        >
          {renderContent()}
        </Link>
      )}
      {!link && renderContent()}
    </Card>
  );
};
