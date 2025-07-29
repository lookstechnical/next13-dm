import { Event, PlayerGroup, Template } from "~/types";
import { Input } from "~/components/ui/input";
import { Field } from "~/components/forms/field";
import { DateField } from "~/components/forms/date";
import { Textarea } from "~/components/ui/textarea";
import { SelectField } from "../select";

type GroupForm = {
  group?: PlayerGroup;
};

// id: string;
//   teamId: string;
//   name: string;
//   description: string;
//   playerIds: string[];
//   createdBy: string;
//   createdAt: string;
//   type: "selection" | "squad" | "program" | "other";
//   status: "active" | "inactive";
//   player_group_members?: Player[];

const PLAYER_GROUP_TYPE = [
  { id: "selection", name: "Selection" },
  { id: "squad", name: "Squad" },
  { id: "program", name: "Program" },
  { id: "other", name: "Other" },
];

export const GroupForm: React.FC<GroupForm> = ({ group }) => {
  return (
    <div className="flex gap-4 flex-col p-4">
      {group && <input type="hidden" name="groupId" value={group.id} />}
      <div className="flex flex-col w-full gap-5">
        <div className="flex flex-row w-full gap-5">
          <Field name="name" label="Name">
            <Input
              name="name"
              placeholder="Enter Group Name"
              defaultValue={group?.name}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
          <SelectField
            name="type"
            label="Type"
            defaultValue={group?.type}
            placeholder="Select Group type"
            options={PLAYER_GROUP_TYPE}
          />
        </div>
        <div>
          <Field name="description" label="Description">
            <Textarea
              name="description"
              placeholder="Enter Description"
              defaultValue={group?.description}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
        </div>
      </div>
      <div className="flex flex-row w-full gap-5"></div>
    </div>
  );
};
