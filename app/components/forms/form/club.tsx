import { Input } from "~/components/ui/input";
import { Field } from "~/components/forms/field";
import { Club } from "~/types";

type ClubForm = {
  club?: Club;
};

export const ClubForm: React.FC<ClubForm> = ({ club }) => {
  return (
    <div className="flex gap-4 flex-col">
      {club && <input type="hidden" name="clubId" value={club.id} />}
      <div className="flex flex-row w-full gap-5">
        <div className="flex flex-col w-full gap-5">
          <Field name="name" label="Name">
            <Input
              name="name"
              placeholder="Enter Players Name"
              defaultValue={club?.name}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
          <Field name="location" label="Location">
            <Input
              name="location"
              placeholder="Enter Location"
              defaultValue={club?.location}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
        </div>
      </div>
      <div className="flex flex-row w-full gap-5"></div>
    </div>
  );
};
