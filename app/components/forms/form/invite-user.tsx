import { Input } from "~/components/ui/input";
import { Field } from "~/components/forms/field";

import { SelectField } from "../select";
import { Team } from "~/types";

type InviteUserForm = {
  teams: Team[];
};
const USER_ROLE = [
  { id: "ADMIN", name: "ADMIN" },
  { id: "HEAD_OF_DEPARTMENT", name: "HEAD_OF_DEPARTMENT" },
  { id: "SCOUT", name: "SCOUT" },
  { id: "COACH", name: "COACH" },
];

export const InviteUserForm: React.FC<InviteUserForm> = ({ teams }) => {
  return (
    <div className="flex gap-4 flex-col p-4">
      <div className="flex flex-col w-full gap-5">
        <div className="flex flex-row w-full gap-5">
          <Field name="email" label="Email">
            <Input
              name="email"
              placeholder="Enter Email"
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
          <Field name="name" label="Name">
            <Input
              name="name"
              placeholder="Enter Name"
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
        </div>
        <div className="flex flex-row gap-4">
          <SelectField
            name="role"
            label="Role"
            placeholder="Select Role"
            options={USER_ROLE}
          />
          <SelectField
            name="team"
            label="Team"
            placeholder="Select Team"
            options={teams?.map((t) => ({ id: t.id, name: t.name }))}
          />
        </div>
      </div>
      <div className="flex flex-row w-full gap-5"></div>
    </div>
  );
};
