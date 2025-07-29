import { Team } from "~/types";
import { Input } from "~/components/ui/input";
import { Field } from "~/components/forms/field";
import { Textarea } from "~/components/ui/textarea";
import { SelectField } from "../select";

type TeamForm = {
  team?: Team;
};

const TEAM_TYPE = [
  { id: "mens", name: "Mens" },
  { id: "womens", name: "Womens" },
  { id: "youth", name: "Youth" },
];

export const TeamForm: React.FC<TeamForm> = ({ team }) => {
  return (
    <div className="flex gap-4 flex-col p-4">
      {team && <input type="hidden" name="groupId" value={team.id} />}
      <div className="flex flex-col w-full gap-5">
        <div className="flex flex-row w-full gap-5">
          <Field name="name" label="Name">
            <Input
              name="name"
              placeholder="Enter Team Name"
              defaultValue={team?.name}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
          <SelectField
            name="type"
            label="Type"
            defaultValue={team?.type}
            placeholder="Select Group type"
            options={TEAM_TYPE}
          />
        </div>
        <div>
          <Field name="description" label="Description">
            <Textarea
              name="description"
              placeholder="Enter Description"
              defaultValue={team?.description}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
        </div>
      </div>
      <div className="flex flex-row w-full gap-5"></div>
    </div>
  );
};
