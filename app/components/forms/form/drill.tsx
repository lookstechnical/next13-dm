import { Club, Player } from "~/types";
import { Input } from "../../ui/input";
import { Field } from "../field";
import { RichTextField } from "../rich-text";
import { CategoryOption, MultiSelectField } from "../multi-select";

type DrillForm = {
  drill?: any;
};

const allCategories: CategoryOption[] = [
  { id: "1", label: "Marketing" },
  { id: "2", label: "Sales" },
  { id: "3", label: "Tech" },
  { id: "4", label: "HR" },
  { id: "5", label: "Design" },
];

export const DrillForm: React.FC<DrillForm> = ({ drill }) => {
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
          <RichTextField
            name="description"
            label="Description"
            placeholder="Enter Description"
            defaultValue={drill?.description}
          />
          <Field name="intensity" label="Intensity">
            <Input
              name="intensity"
              placeholder="Enter Intensity"
              defaultValue={drill?.intensity}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
          <div className="flex flex-row gap-4">
            <Field name="videoUrl" label="Video Url">
              <Input
                name="videoUrl"
                placeholder="Enter Video Url"
                defaultValue={drill?.videoUrl}
                className="bg-card border-gray-600 text-white placeholder:text-gray-400"
              />
            </Field>
            <Field name="imageUrl" label="Image Url">
              <Input
                name="imageUrl"
                placeholder="Enter Video Url"
                defaultValue={drill?.videoUrl}
                className="bg-card border-gray-600 text-white placeholder:text-gray-400"
              />
            </Field>
          </div>
          <MultiSelectField
            name="categories"
            label="Categories"
            placeholder="Enter Description"
            options={allCategories}
          />
        </div>
      </div>
    </div>
  );
};
