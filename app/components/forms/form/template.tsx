import { Attribute, Template } from "~/types";
import { Input } from "~/components/ui/input";
import { Field } from "~/components/forms/field";
import { AttributeCard } from "~/components/attribute/attribute-card";
import { useState } from "react";

type TemplateForm = {
  template?: Template;
  attributes?: Attribute[];
};

export const TemplateForm: React.FC<TemplateForm> = ({
  template,
  attributes,
}) => {
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>(
    template
      ? template.templateAttributes.map((ta) => ta.reportAttributes.id)
      : []
  );

  const toggleSelection = (playerId: string) => {
    setSelectedAttributes((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  return (
    <div className="flex gap-4 flex-col p-4">
      {template && (
        <input type="hidden" name="templateId" value={template.id} />
      )}
      <div className="flex flex-col w-full gap-5">
        <div className="flex flex-row w-full gap-5">
          <Field name="name" label="Name">
            <Input
              name="name"
              placeholder="Enter Event Name"
              defaultValue={template?.name}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
        </div>
        <div className="text-foreground">
          <input
            type="hidden"
            name="attributeIds"
            value={JSON.stringify(selectedAttributes)}
          />
          {attributes?.map((attribute) => (
            <AttributeCard
              key={`attribute-select-card-${attribute.id}`}
              attribute={attribute}
              isSelected={selectedAttributes.includes(attribute.id)}
              onSelect={toggleSelection}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-row w-full gap-5"></div>
    </div>
  );
};
