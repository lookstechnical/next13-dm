import { Link } from "@remix-run/react";
import { Card } from "../ui/card";
import { Event } from "~/types";
import { formatDate } from "~/utils/helpers";
import { Badge } from "../ui/badge";

type EventCard = {
  event: Event;
  to: (playerId: string) => string;
};

export const EventCard: React.FC<EventCard> = ({ to, event }) => {
  const link = to(event.id);
  return (
    <Card className="border-border">
      <Link to={link}>
        <div className="p-6">
          <div className="flex">
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-white">
                {event?.name}
              </h3>
              <p>{formatDate(event.date)}</p>
              <p>{event.location}</p>
            </div>
            <div className="flex flex-col items-end">
              <Badge variant="outline" className="uppercase text-xs">
                {event.status}
              </Badge>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
};
