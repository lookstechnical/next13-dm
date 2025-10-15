import { Club, Player, User } from "~/types";
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
  users?: User[];
};

const sizes = ["XS", "SM", "M", "LG", "XL", "XXL", "XXXL"];

export const PlayerForm: React.FC<PlayerForm> = ({
  player,
  clubs,
  errors,
  users,
}) => {
  return (
    <div className="flex gap-4 flex-col">
      {player && <input type="hidden" name="playerId" value={player.id} />}
      {player?.photoUrl && (
        <input type="hidden" name="photoUrl" value={player.photoUrl} />
      )}
      <div className="flex flex-col lg:flex-row w-full gap-5">
        <div className="w-full md:w-1/3 flex items-center justify-center">
          <ImageUpload
            isProfile
            image={player?.photoUrl as string}
            errors={errors}
          />
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

          <div className="flex flex-col lg:flex-row w-full gap-5">
            <SelectField
              name="shirt"
              label="Shirt Size"
              defaultValue={player?.shirt}
              errors={errors}
              options={sizes?.map((c) => ({ id: c, name: c })) || []}
            />

            <SelectField
              name="shorts"
              label="Shorts Size"
              defaultValue={player?.shorts}
              errors={errors}
              options={sizes?.map((c) => ({ id: c, name: c })) || []}
            />
          </div>
          {users && (
            <div>
              <SelectField
                name="mentor"
                label="Mentor"
                defaultValue={player?.mentor}
                errors={errors}
                options={users?.map((c) => ({ id: c.id, name: c.name })) || []}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
