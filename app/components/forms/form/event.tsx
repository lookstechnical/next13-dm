import { Event, Template } from "~/types";
import { Input } from "~/components/ui/input";
import { Field } from "~/components/forms/field";
import { DateField } from "~/components/forms/date";
import { Textarea } from "~/components/ui/textarea";
import { SelectField } from "../select";

type EventForm = {
  event?: Event;
  templates?: Template[];
};

export const EventForm: React.FC<EventForm> = ({ event, templates }) => {
  return (
    <div className="flex gap-4 flex-col p-4">
      {event && <input type="hidden" name="playerId" value={event.id} />}
      <div className="flex flex-col w-full gap-5">
        <div className="flex flex-row w-full gap-5">
          <Field name="name" label="Name">
            <Input
              name="name"
              placeholder="Enter Event Name"
              defaultValue={event?.name}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
          <Field name="location" label="Location">
            <Input
              name="location"
              placeholder="Enter Location"
              defaultValue={event?.location}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
        </div>
        <div className="flex flex-row w-full gap-5">
          <DateField
            name="date"
            label="Date"
            defaultValue={event?.date ? new Date(event?.date) : undefined}
          />
          <DateField
            name="registrationDeadline"
            label="Registration Deadline"
            defaultValue={
              event?.registrationDeadline
                ? new Date(event?.registrationDeadline)
                : undefined
            }
          />
        </div>
        <div className="flex flex-row w-full gap-4">
          <SelectField
            placeholder="Event Type"
            name="event-type"
            label="Event type"
            options={[
              { id: "programme", name: "Programme" },
              { id: "training", name: "Training" },
              { id: "camp", name: "Camp" },
            ]}
          />

          <Field name="canRegister" label="Can Register">
            <Input
              name="canRegister"
              type="checkbox"
              checked={event?.canRegister}
              className="w-4 h-4"
            />
          </Field>
        </div>
        <div>
          <Field name="description" label="Description">
            <Textarea
              name="description"
              placeholder="Enter Description"
              defaultValue={event?.description}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
        </div>
        <div>
          {templates.length > 0 && (
            <SelectField
              placeholder="Select a Report Template"
              name="templateId"
              label="Template"
              options={
                templates?.map((template) => ({
                  id: template.id,
                  name: template.name,
                })) || []
              }
            />
          )}
        </div>
      </div>
      <div className="flex flex-row w-full gap-5"></div>
    </div>
  );
};
