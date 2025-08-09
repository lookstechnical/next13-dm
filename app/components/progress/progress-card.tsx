import { Attribute, PlayerReport } from "~/types";
import RadarAttributes from "../charts/radar";

type ProgressCard = {
  report: PlayerReport;
  teamProgress: any;
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

export const ProgressCard: React.FC<ProgressCard> = ({
  report,
  teamProgress,
}) => {
  const categories = groupByCategory(report.reportScores);
  return (
    <div className="grid grid-cols-4 text-white mt-4 gap-6 x-space-6">
      {Object.keys(categories).map((category) => (
        <div>
          <h3 className="uppercase">{category}</h3>
          <RadarAttributes
            attributes={categories[category]}
            averages={teamProgress?.scores.filter(
              (s) => s.attributeCategory === category
            )}
          />
        </div>
      ))}
    </div>
  );
};
