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
  errors?: any[];
};

export const PlayerForm: React.FC<PlayerForm> = ({ player, clubs, errors }) => {
  return (
    <div className="flex gap-4 flex-col">
      {player && <input type="hidden" name="playerId" value={player.id} />}
      <div className="flex flex-col lg:flex-row w-full gap-5">
        <div className="w-1/3 flex items-center justify-center">
          <ImageUpload image={player?.photoUrl as string} errors={errors} />
        </div>
        <div className="flex flex-col w-full gap-5">
          <Field name="name" label="Name" errors={errors}>
            <Input
              name="name"
              placeholder="Enter Players Name"
              defaultValue={player?.name}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
          <Field name="email" label="Email" errors={errors}>
            <Input
              name="email"
              placeholder="Enter your email"
              defaultValue={player?.email}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
          <div className="flex flex-row gap-4">
            <Field name="mobile" label="Mobile Phone" errors={errors}>
              <Input
                name="mobile"
                placeholder="Enter your mobile number"
                defaultValue={player?.mobile}
                className="bg-card border-gray-600 text-white placeholder:text-gray-400"
              />
            </Field>
            <DateField
              errors={errors}
              name="dateOfBirth"
              label="Date of Birth"
              defaultValue={
                player?.dateOfBirth ? new Date(player?.dateOfBirth) : undefined
              }
            />
          </div>
          <div className="flex flex-col md:flex-row w-full gap-5">
            <PositionSelect
              errors={errors}
              defaultValue={player?.position}
              placeholder="Select a playing position"
              name="position"
              label="Position"
            />
            <PositionSelect
              errors={errors}
              defaultValue={player?.secondaryPosition}
              placeholder="Select a secondary playing position"
              name="secondaryPosition"
              label="Secondary position"
            />
          </div>

          <SelectField
            name="club"
            label="Club"
            defaultValue={player?.club}
            placeholder="Select a Club"
            options={clubs?.map((c) => ({ id: c.name, name: c.name })) || []}
            errors={errors}
          />
        </div>
      </div>
    </div>
  );
};
