import { Input } from "~/components/ui/input";
import { Field } from "~/components/forms/field";
import { RichTextField } from "../rich-text";
import { DrillField } from "../drill";
import { Select } from "~/components/ui/select";
import { SelectField } from "../select";

type LibraryItemForm = {
  libraryItem?: any;
  item?: any;
};

export const LibraryItemForm: React.FC<LibraryItemForm> = ({
  libraryItem,
  item,
}) => {
  return (
    <div className="flex gap-4 flex-col p-4 text-foreground">
      {libraryItem && (
        <input type="hidden" name="attributeId" value={item?.id} />
      )}
      <div className="flex flex-col w-full gap-5">
        <div className="flex flex-row w-full gap-5">
          <DrillField defaultValue={item?.drills} />
        </div>
        <div className="text-foreground text-sm">
          <RichTextField
            name="description"
            label="Description"
            defaultValue={item?.description}
          />
        </div>
        <div>
          <SelectField
            label="Type"
            name="type"
            defaultValue={item?.type}
            options={[
              { id: "drill", name: "Drill" },
              { id: "section", name: "Section" },
            ]}
          />
        </div>

        <div className="flex flex-row w-full gap-5">
          <Field name="assignedTo" label="Assigned to">
            <Input
              name="assignedTo"
              placeholder="Who is responsible"
              defaultValue={item?.assignedTo}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
          <Field name="duration" label="Duration">
            <Input
              name="duration"
              placeholder="Duration"
              defaultValue={item?.duration}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
        </div>
      </div>
    </div>
  );
};
