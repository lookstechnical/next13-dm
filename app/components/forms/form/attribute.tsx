import { Attribute } from "~/types";
import { Input } from "~/components/ui/input";
import { Field } from "~/components/forms/field";
import { Textarea } from "~/components/ui/textarea";

type AttributeForm = {
  attribute?: Attribute;
};

export const AttributeForm: React.FC<AttributeForm> = ({ attribute }) => {
  return (
    <div className="flex gap-4 flex-col p-4">
      {attribute && (
        <input type="hidden" name="attributeId" value={attribute.id} />
      )}
      <div className="flex flex-col w-full gap-5">
        <div className="flex flex-row w-full gap-5">
          <Field name="name" label="Name">
            <Input
              name="name"
              placeholder="Enter Event Name"
              defaultValue={attribute?.name}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
        </div>

        <div>
          <Field name="description" label="Description">
            <Textarea
              name="description"
              placeholder="Enter Description"
              defaultValue={attribute?.description}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
        </div>
      </div>
      <div className="flex flex-row w-full gap-5"></div>
    </div>
  );
};
