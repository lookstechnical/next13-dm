import { Attribute, Player, PlayerReport, Template } from "~/types";
import { Field } from "~/components/forms/field";
import { Slider } from "~/components/ui/slider";

type NineBoxForm = {
  report?: PlayerReport;
  template: Template;
  player: Player;
};

function groupByCategory(attributes: Attribute[]): Record<string, Attribute[]> {
  return attributes.reduce((acc, attr) => {
    const { category } = attr.reportAttributes;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(attr);
    return acc;
  }, {} as Record<string, Attribute[]>);
}

const scores: any[] = Array.from({ length: 10 }, (_, i) => ({
  id: String(i + 1),
  name: String(i + 1),
}));

export const NineBoxForm: React.FC<NineBoxForm> = ({
  template,
  player,
  report,
}) => {
  const attributes = groupByCategory(template?.templateAttributes);

  return (
    <div className="flex gap-4 flex-col p-4">
      {player && <input type="hidden" name="playerId" value={player.id} />}
      {template && (
        <input type="hidden" name="templateId" value={template.id} />
      )}
      {report && <input type="hidden" name="reportId" value={report.id} />}
      <div className="flex flex-col w-full gap-5 overflow-scroll h-[70vh]">
        <div className="flex flex-col gap-4">
          {Object.keys(attributes).map((category) => (
            <div className="pb-10 flex flex-col gap-4">
              <h2 className="text-foreground text-lg uppercase">{category}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {attributes[category]?.map(
                  ({
                    reportAttributes: attribute,
                  }: {
                    reportAttributes: Attribute;
                  }) => {
                    const score = report?.reportScores.find(
                      (s) => s.attributeId === attribute.id
                    );

                    return (
                      <Field
                        name={`attribute[${attribute.id}]`}
                        label={attribute.name}
                      >
                        <Slider
                          className=""
                          max={10}
                          step={1}
                          defaultValue={[score?.score || 5]}
                          name={`attribute[${attribute.id}]`}
                        />
                      </Field>
                    );
                  }
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-row w-full gap-5"></div>
    </div>
  );
};
