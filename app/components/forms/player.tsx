import { Club, Player } from "~/types";
import { Input } from "../ui/input";
import { Field } from "./field";
import { PositionSelect } from "./position";
import { SelectField } from "./select";
import { DateField } from "./date";
import { ImageUpload } from "./image-upload";

type PlayerForm = {
  player?: Player;
  clubs?: Club[];
};

export const PlayerForm: React.FC<PlayerForm> = ({ player, clubs }) => {
  return (
    <div className="flex gap-4 flex-col">
      {player && <input type="hidden" name="playerId" value={player.id} />}
      <div className="flex flex-row w-full gap-5">
        <div className="w-1/3 flex items-center justify-center">
          <ImageUpload image={player?.photoUrl as string} />
        </div>
        <div className="flex flex-col w-full gap-5">
          <Field name="name" label="Name">
            <Input
              name="name"
              placeholder="Enter Players Name"
              defaultValue={player?.name}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
          <Field name="email" label="Email">
            <Input
              name="email"
              placeholder="Enter your email"
              defaultValue={player?.email}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
          <DateField
            name="dateOfBirth"
            label="Date of Birth"
            defaultValue={
              player?.dateOfBirth ? new Date(player?.dateOfBirth) : undefined
            }
          />
        </div>
      </div>
      <div className="flex flex-col md:flex-row w-full gap-5">
        <PositionSelect
          defaultValue={player?.position}
          name="position"
          label="Position"
        />
        <PositionSelect
          defaultValue={player?.secondaryPosition}
          name="secondaryPosition"
          label="Secondary position"
        />
        <SelectField
          name="club"
          label="Club"
          defaultValue={player?.club}
          options={clubs?.map((c) => ({ id: c.name, name: c.name })) || []}
        />
      </div>
    </div>
  );
};
