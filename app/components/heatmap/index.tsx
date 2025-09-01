import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { getHeatmapColor } from "./heat-block";

export function AttributeHeatmap({ attributes, onCellClick }) {
  return (
    <Card className="bg-background border-gray-800 shadow-lg rounded-lg text-foreground">
      <CardHeader>
        <CardTitle className="text-lg">Attribute Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        {attributes && attributes.length ? (
          <div className="grid grid-cols-5 gap-2">
            {/* adjustable grid size */}
            <TooltipProvider>
              {attributes.map((attr, idx) => {
                return (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <div
                        onClick={() => onCellClick(attr.name)}
                        className={`aspect-square opacity-[0.4] hover:opacity-[0.6] rounded-md cursor-pointer ${getHeatmapColor(
                          attr.avgScore
                        )} flex items-center justify-center`}
                      ></div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {attr.attributeName}: {attr.avgScore}/10 (Team Avg)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
        ) : (
          <div className="text-sm flex w-full h-full justify-center items-center">
            No progress report data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
