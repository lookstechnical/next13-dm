import { Link } from "@remix-run/react";
import { Card } from "../ui/card";
import { Event } from "~/types";
import { formatDate } from "~/utils/helpers";
import { Badge } from "../ui/badge";
import { Calendar, Locate, MapPin } from "lucide-react";

type EventCard = {
  event: Event;
  to?: (playerId: string) => string;
};

export const EventCard: React.FC<EventCard> = ({ to, event }) => {
  const link = to ? to(event.id) : undefined;

  const renderContent = () => {
    return (
      <div className="p-6">
        <div className="flex">
          <div className="flex-grow">
            <h3 className="text-lg font-semibold text-white">{event?.name}</h3>
            <p className="text-sm flex flex-row gap-2 items-center">
              <Calendar className="w-4" />
              {formatDate(event.date)}
            </p>
            <p className="text-sm text-muted flex flex-row gap-2 items-center">
              <MapPin className="w-3" /> {event.location}
            </p>
          </div>
          <div className="flex flex-col items-end">
            {/* <Badge variant="outline" className="uppercase text-xs">
                {event.status}
              </Badge> */}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border">
      {link && <Link to={link} className="block transition-all hover:opacity-80 active:opacity-60">{renderContent()}</Link>}
      {!link && renderContent()}
    </Card>
  );
};
