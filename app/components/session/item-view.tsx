import { Drill } from "~/types";
import VideoPlayer from "../video/video";
import { FC } from "react";
import { Badge } from "../ui/badge";

type ItemView = {
  item: Drill;
};
export const ItemView: FC<ItemView> = ({ item }) => {
  return (
    <div className="text-foreground flex flex-col gap-4 xl:pr-40">
      <div className="aspect-video bg-background">
        {item?.videoUrl && <VideoPlayer url={item?.videoUrl} />}
        {item?.imageUrl && <img src={item?.imageUrl} className="w-full" />}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-background">
          <h3 className="text-muted text-sm">Description</h3>
          <div
            className="py-4 bg-background"
            dangerouslySetInnerHTML={{ __html: item?.description }}
          />
        </div>

        <div className="p-4 bg-background">
          <h3 className="text-muted text-sm">Coaching Points</h3>
          <ul className="text-sm list-disc pl-4 pt-4">
            {item.coachingPoints?.map((c) => (
              <li>{c}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-row gap-2 pt-4 py-4 bg-wkbackground">
        {item?.categories?.map((c: any) => (
          <Badge
            variant="outline"
            className="text-sm rounded-lg bg-background border-input"
          >
            {c.name}
          </Badge>
        ))}
      </div>
    </div>
  );
};
