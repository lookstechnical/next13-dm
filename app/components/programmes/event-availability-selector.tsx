import { Event } from "~/types";
import { formatDate } from "~/utils/helpers";
import { Calendar, MapPin } from "lucide-react";

type EventAvailabilitySelectorProps = {
  events: { eventId: string; events: Event }[];
  // Optional map of eventId -> available, used to pre-fill the checkboxes when
  // an existing registration is being updated. Events without an entry default
  // to checked, matching the initial-registration behaviour.
  availability?: Record<string, boolean>;
};

export const EventAvailabilitySelector: React.FC<
  EventAvailabilitySelectorProps
> = ({ events, availability }) => {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Select the events you are available to attend:
      </p>
      {events.map((pe) => (
        <label
          key={pe.eventId}
          className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-card/50 cursor-pointer"
        >
          <input
            type="checkbox"
            name={`event_${pe.eventId}`}
            value="true"
            defaultChecked={availability ? availability[pe.eventId] ?? true : true}
            className="mt-1 w-4 h-4"
          />
          <div className="flex-grow">
            <p className="text-sm font-medium text-white">
              {pe.events?.name}
            </p>
            {pe.events?.date && (
              <p className="text-xs text-muted flex items-center gap-1">
                <Calendar className="w-3" />
                {formatDate(pe.events.date)}
              </p>
            )}
            {pe.events?.location && (
              <p className="text-xs text-muted flex items-center gap-1">
                <MapPin className="w-3" />
                {pe.events.location}
              </p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
};
