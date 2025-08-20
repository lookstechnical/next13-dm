import { Attribute, Event, Player, PlayerReport, Template } from "~/types";
import { Input } from "~/components/ui/input";
import { Field } from "~/components/forms/field";
import { Textarea } from "~/components/ui/textarea";
import { PositionSelect } from "../position";
import { Slider } from "~/components/ui/slider";

type ReportForm = {
  report?: PlayerReport;
  event?: Event;
  template: Template;
  player: Player;
};

export const ReportForm: React.FC<ReportForm> = ({
  event,
  template,
  player,
  report,
}) => {
  return (
    <div className="flex gap-4 flex-col p-4">
      {event && <input type="hidden" name="eventId" value={event.id} />}
      {player && <input type="hidden" name="playerId" value={player.id} />}
      {template && (
        <input type="hidden" name="templateId" value={template.id} />
      )}
      <div className="flex flex-col w-full gap-5">
        <div>
          <Field name="notes" label="Notes">
            <Textarea
              name="notes"
              placeholder="Enter Notes"
              defaultValue={report?.notes}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
        </div>
        <div className="flex flex-row gap-4">
          <Field name="position" label="Position (observed)">
            <PositionSelect defaultValue={report?.position} name="position" />
          </Field>
          <Field name="suggestedPosition" label="Suggested position">
            <PositionSelect
              defaultValue={report?.suggestedPosition}
              name="suggestedPosition"
            />
          </Field>
        </div>
        <div className="flex flex-col gap-4">
          {template?.templateAttributes?.map(
            ({
              reportAttributes: attribute,
            }: {
              reportAttributes: Attribute;
            }) => {
              return (
                <Field
                  name={`attribute[${attribute.id}]`}
                  label={attribute.name}
                  tooltip={attribute.description}
                >
                  <Slider
                    className=""
                    defaultValue={[5]}
                    max={10}
                    step={1}
                    name={`attribute[${attribute.id}]`}
                  />
                </Field>
              );
            }
          )}
        </div>
      </div>
      <div className="flex flex-row w-full gap-5"></div>
    </div>
  );
};
