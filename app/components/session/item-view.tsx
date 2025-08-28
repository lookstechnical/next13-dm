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
      <div className="aspect-video bg-wkbackground">
        {item?.videoUrl && <VideoPlayer url={item?.videoUrl} />}
        {item?.imageUrl && <img src={item?.imageUrl} className="w-full" />}
      </div>
      <div
        className="p-4 bg-wkbackground"
        dangerouslySetInnerHTML={{ __html: item?.description }}
      />
      <div className="flex flex-row gap-2 pt-4 p-4 bg-wkbackground">
        {item?.categories?.map((c: any) => (
          <Badge variant="outline" className="text-sm">
            {c.name}
          </Badge>
        ))}
      </div>
    </div>
  );
};
