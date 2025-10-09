import { Club, Player } from "~/types";
import { Input } from "../../ui/input";
import { Field } from "../field";
import { RichTextField } from "../rich-text";
import { CategoryOption, MultiSelectField } from "../multi-select";
import { ImageUpload } from "../image-upload";
import StringArrayInput from "../list-field";

type DrillForm = {
  drill?: any;
  categories?: any[];
};

export const DrillForm: React.FC<DrillForm> = ({ drill, categories }) => {
  return (
    <div className="flex gap-4 flex-col">
      {drill && <input type="hidden" name="playerId" value={drill.id} />}
      <div className="flex flex-row w-full gap-5">
        <div className="flex flex-col w-full gap-5">
          <Field name="name" label="Name">
            <Input
              name="name"
              placeholder="Enter Title"
              defaultValue={drill?.name}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
          <div className="flex flex-row gap-4">
            <Field name="videoUrl" label="Video Url">
              <ImageUpload
                name="video"
                accept="video/*"
                image={drill?.imageUrl}
              />
              <Input
                name="videoUrl"
                placeholder="Enter Video Url"
                defaultValue={drill?.videoUrl}
                className="bg-card border-gray-600 text-white placeholder:text-gray-400"
              />
            </Field>

            <Field name="imageUrl" label="Image Url">
              <ImageUpload name="image" image={drill?.imageUrl} />
              <Input
                name="imageUrl"
                placeholder="Enter Image Url"
                defaultValue={drill?.imageUrl}
                className="bg-card border-gray-600 text-white placeholder:text-gray-400"
              />
            </Field>
          </div>

          <div className="flex flex-row gap-4">
            <RichTextField
              name="description"
              label="Description"
              placeholder="Enter Description"
              defaultValue={drill?.description}
            />
            <StringArrayInput
              name="coachingPoints"
              label="Coaching points"
              defaultValue={drill?.coachingPoints || []}
            />
          </div>
          <Field name="intensity" label="Intensity">
            <Input
              name="intensity"
              placeholder="Enter Intensity"
              defaultValue={drill?.intensity}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>

          <MultiSelectField
            name="categories"
            label="Categories"
            placeholder="Enter Description"
            defaultValue={drill?.categories?.map((c) => c.id)}
            canCreate
            options={categories?.map((c) => ({ id: c.id, label: c.name }))}
          />
        </div>
      </div>
    </div>
  );
};
