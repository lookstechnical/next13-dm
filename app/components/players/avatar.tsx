import { User } from "lucide-react";
import { cn } from "~/lib/utils";

export const Avatar = ({
  photoUrl,
  name,
  size = 24,
  containerSize = "w-16 h-16",
}: {
  photoUrl: string;
  name: string;
  size: number;
  containerSize: string;
}) => {
  return (
    <div>
      {photoUrl ? (
        <img
          width={16}
          height={16}
          alt={name}
          className={cn(containerSize, "rounded-full object-cover mr-4")}
          src={photoUrl}
        />
      ) : (
        <div
          className={cn(
            containerSize,
            "rounded-full bg-gray-200 flex items-center justify-center mr-4"
          )}
        >
          <User size={size} className="text-gray-400" />
        </div>
      )}
    </div>
  );
};
