import { Club, Player, User } from "~/types";
import { AdditionalEmails } from "./additional-emails";
import { Input } from "../ui/input";
import { Field } from "./field";
import { PositionSelect } from "./position";
import { SelectField } from "./select";
import { DateField } from "./date";
import { ImageUpload } from "./image-upload";
import { KIT_SIZES } from "~/utils/kit";

type PlayerForm = {
  player?: Player;
  clubs?: Club[];
  errors?: any[];
  users?: User[];
  hideKit?: boolean;
  /**
   * Which fields to render, by the keys in app/utils/programme-fields.ts.
   *
   * Undefined means "render everything", so the dashboard and invite flows —
   * which have no notion of a programme — are unaffected. Only the public
   * programme registration passes a list.
   */
  fields?: string[];
  /** Subset of `fields` to mark with an asterisk. */
  requiredFields?: string[];
};



export const PlayerForm: React.FC<PlayerForm> = ({
  player,
  clubs,
  errors,
  users,
  hideKit,
  fields,
  requiredFields,
}) => {
  // No list supplied = every caller that predates configurable fields, which
  // expects the whole form.
  const shows = (key: string) => !fields || fields.includes(key);
  const needs = (key: string) => !!requiredFields?.includes(key);

  return (
    <div className="flex gap-4 flex-col">
      {player && <input type="hidden" name="playerId" value={player.id} />}
      {player?.photoUrl && (
        <input type="hidden" name="photoUrl" value={player.photoUrl} />
      )}
      <div className="flex flex-col lg:flex-row w-full gap-5">
        {shows("photo") && (
          <div className="w-full md:w-1/3 flex flex-col items-center justify-center">
            <ImageUpload
              isProfile
              image={player?.photoUrl as string}
              errors={errors}
            />
            {needs("photo") && (
              <p className="text-xs text-muted mt-6">
                Photo required <span className="text-destructive">*</span>
              </p>
            )}
          </div>
        )}
        <div className="flex flex-col w-full gap-5">
          {shows("name") && (
          <Field
            name="name"
            label="Name"
            required={needs("name")}
            errors={errors}
          >
            <Input
              name="name"
              placeholder="Enter Players Name"
              defaultValue={player?.name}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
          )}
          {shows("email") && (
          <Field
            name="email"
            label="Email"
            required={needs("email")}
            errors={errors}
          >
            <Input
              name="email"
              placeholder="Enter your email"
              defaultValue={player?.email}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
          )}
          {/* Rides along with the email field rather than being its own
              programme-configurable key: a form that asks for an address
              should always let a second parent add theirs. */}
          {shows("email") && (
            <AdditionalEmails defaultValue={player?.additionalEmails} />
          )}
          {(shows("mobile") || shows("dateOfBirth")) && (
            <div className="flex flex-row gap-4">
              {shows("mobile") && (
                <Field
                  name="mobile"
                  label="Mobile Phone"
                  required={needs("mobile")}
                  errors={errors}
                >
                  <Input
                    name="mobile"
                    placeholder="Enter your mobile number"
                    defaultValue={player?.mobile}
                    className="bg-card border-gray-600 text-white placeholder:text-gray-400"
                  />
                </Field>
              )}
              {shows("dateOfBirth") && (
                <DateField
                  errors={errors}
                  range="past"
                  name="dateOfBirth"
                  label="Date of Birth"
                  required={needs("dateOfBirth")}
                  defaultValue={
                    player?.dateOfBirth
                      ? new Date(player?.dateOfBirth)
                      : undefined
                  }
                />
              )}
            </div>
          )}
          {(shows("position") || shows("secondaryPosition")) && (
            <div className="flex flex-col md:flex-row w-full gap-5">
              {shows("position") && (
                <PositionSelect
                  errors={errors}
                  defaultValue={player?.position}
                  placeholder="Select a playing position"
                  name="position"
                  label="Position"
                  required={needs("position")}
                />
              )}
              {shows("secondaryPosition") && (
                <PositionSelect
                  errors={errors}
                  defaultValue={player?.secondaryPosition}
                  placeholder="Select a secondary playing position"
                  name="secondaryPosition"
                  label="Secondary position"
                  required={needs("secondaryPosition")}
                />
              )}
            </div>
          )}

          {shows("club") && (
            <SelectField
              name="club"
              label="Club"
              defaultValue={player?.club}
              placeholder="Select a Club"
              options={clubs?.map((c) => ({ id: c.name, name: c.name })) || []}
              required={needs("club")}
              errors={errors}
            />
          )}

          {!hideKit && shows("kit") && (
            <div className="flex flex-col lg:flex-row w-full gap-5">
              <SelectField
                name="shirt"
                label="Shirt Size"
                defaultValue={player?.shirt}
                required={needs("kit")}
                errors={errors}
                options={KIT_SIZES.map((c) => ({ id: c, name: c }))}
              />

              <SelectField
                name="shorts"
                label="Shorts Size"
                defaultValue={player?.shorts}
                required={needs("kit")}
                errors={errors}
                options={KIT_SIZES.map((c) => ({ id: c, name: c }))}
              />
            </div>
          )}
          {users && shows("mentor") && (
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
