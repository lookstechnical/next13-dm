import { Programme, Event, ProgrammeSection } from "~/types";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Field } from "~/components/forms/field";
import { DateField } from "~/components/forms/date";
import { SelectField } from "../select";
import { ImageUpload } from "~/components/forms/image-upload";
import { RichTextField } from "~/components/forms/rich-text";
import { SectionsEditor } from "~/components/programmes/sections-editor";

type ProgrammeFormProps = {
  programme?: Programme;
  events?: Event[];
  selectedEventIds?: string[];
};

export const ProgrammeForm: React.FC<ProgrammeFormProps> = ({
  programme,
  events,
  selectedEventIds = [],
}) => {
  return (
    <div className="flex gap-4 flex-col p-4">
      {programme && (
        <input type="hidden" name="programmeId" value={programme.id} />
      )}
      <div className="flex flex-col w-full gap-5">
        <ImageUpload
          image={programme?.imageUrl}
          name="image"
          accept="image/*"
        />
        <Field name="name" label="Name">
          <Input
            name="name"
            placeholder="Enter Programme Name"
            defaultValue={programme?.name}
            className="bg-card border-gray-600 text-white placeholder:text-gray-400"
          />
        </Field>
        <RichTextField
          name="description"
          label="Description"
          placeholder="Enter Description"
          defaultValue={programme?.description}
        />
        <div className="flex flex-row w-full gap-5">
          <DateField
            name="registrationDeadline"
            label="Registration Deadline"
            defaultValue={
              programme?.registrationDeadline
                ? new Date(programme.registrationDeadline)
                : undefined
            }
          />
          <SelectField
            placeholder="Status"
            name="status"
            label="Status"
            options={[
              { id: "upcoming", name: "Upcoming" },
              { id: "ongoing", name: "Ongoing" },
              { id: "completed", name: "Completed" },
              { id: "cancelled", name: "Cancelled" },
            ]}
            defaultValue={programme?.status}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-300 mb-2 block">
            Eligible Date of Birth Range
          </label>
          <p className="text-xs text-muted mb-3">
            Restrict registration to players born within this date range.
          </p>
          <div className="flex flex-row w-full gap-5">
            <DateField
              name="eligibleDobFrom"
              label="Born From"
              defaultValue={
                programme?.eligibleDobFrom
                  ? new Date(programme.eligibleDobFrom)
                  : undefined
              }
            />
            <DateField
              name="eligibleDobTo"
              label="Born To"
              defaultValue={
                programme?.eligibleDobTo
                  ? new Date(programme.eligibleDobTo)
                  : undefined
              }
            />
          </div>
        </div>
        <SectionsEditor defaultSections={programme?.sections} />
        <Field name="availabilityDescription" label="Availability Description">
          <Textarea
            name="availabilityDescription"
            placeholder="Message shown to users on the availability step e.g. 'Please select the sessions you can attend'"
            defaultValue={programme?.availabilityDescription}
            className="bg-card border-gray-600 text-white placeholder:text-gray-400"
          />
        </Field>
        <Field name="canRegister" label="Open for Registration">
          <Input
            name="canRegister"
            type="checkbox"
            defaultChecked={programme?.canRegister ?? true}
            className="w-4 h-4"
          />
        </Field>
        {events && events.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Select Events
            </label>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {events.map((event) => (
                <label
                  key={event.id}
                  className="flex items-center gap-2 p-2 rounded border border-border hover:bg-card/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    name="eventIds"
                    value={event.id}
                    defaultChecked={selectedEventIds.includes(event.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-white">{event.name}</span>
                  {event.date && (
                    <span className="text-xs text-muted ml-auto">
                      {new Date(event.date).toLocaleDateString()}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
