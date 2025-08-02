import { DownloadIcon, FilterXIcon, UserPlus } from "lucide-react";
import { Input } from "../ui/input";
import { Link } from "@remix-run/react";
import { ReactNode } from "react";

type ListingHeader = {
  title: string;
  renderFilters?: () => ReactNode;
  renderActions?: () => ReactNode;
};

export const ListingHeader: React.FC<ListingHeader> = ({
  title,
  renderFilters,
  renderActions,
}) => {
  return (
    <div className="w-full flex flex-row justify-between items-center mb-6">
      <div className="flex flex-row gap-2 w-1/2 items-center">
        <h1 className="text-2xl font-bold text-white w-[90%] md:w-1/2">
          {title}
        </h1>
        <div className="md:w-2/3 flex flex-row gap-2 items-center text-muted ">
          {renderFilters && renderFilters()}
        </div>
      </div>
      <div className="flex space-x-2">{renderActions && renderActions()}</div>
    </div>
  );
};
