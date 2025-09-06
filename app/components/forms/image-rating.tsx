import { LucideIcon, Star } from "lucide-react";
import { useState } from "react";
import { cn } from "~/lib/utils";

export interface RatingItem {
  /** Can be an image URL or a React component (icon) */
  image: string | LucideIcon;
  description: string;
}

interface ImageRatingProps {
  name: string;
  items?: RatingItem[];
  onRate?: (rating: number) => void;
  disabled: true;
  defaultValue?: number;
  size?: number;
}

const defaultItems: RatingItem[] = [
  { image: Star, description: "Poor" },
  { image: Star, description: "Fair" },
  { image: Star, description: "Good" },
  { image: Star, description: "Very Good" },
  { image: Star, description: "Excellent" },
];

const sizeToImageWidth = (size: number) => {
  switch (size) {
    case 10:
      return "w-4 h-4";
    default:
      return "w-6 h-6";
  }
};

const ImageRating: React.FC<ImageRatingProps> = ({
  name,
  items = defaultItems,
  onRate,
  disabled,
  defaultValue,
  size = 20,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    defaultValue || null
  );

  const handleClick = (index: number) => {
    setSelectedIndex(index);
    if (onRate) onRate(index + 1);
  };

  const renderImage = (image: string | LucideIcon, size: number = 64) => {
    if (typeof image === "string") {
      return (
        <img
          src={image}
          alt=""
          className={cn("object-cover rounded-full", sizeToImageWidth(size))}
        />
      );
    }
    const IconComponent = image;
    return <IconComponent size={size} />;
  };

  return (
    <div className="flex flex-col items-start pt-4">
      {!disabled && (
        <input type="hidden" name={name} value={String(selectedIndex)} />
      )}
      <div className="grid grid-cols-5 gap-4">
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "flex flex-col items-center cursor-pointer transition-transform transform",
              index === selectedIndex
                ? "text-secondary border-secondary"
                : "text-muted border-muted",
              disabled
                ? ""
                : "hover:scale-110 hover:text-foreground hover:border-foreground"
            )}
            onClick={() => (disabled ? null : handleClick(index))}
          >
            <div
              className={cn(
                `border-2 rounded-full p-2`,
                index === selectedIndex
                  ? "text-secondary border-secondary"
                  : "text-muted border-muted"
              )}
            >
              {renderImage(item.image, size)}
            </div>
            {!disabled && (
              <span className="mt-2 text-sm text-center text-sm">
                {item.description}
              </span>
            )}
          </div>
        ))}
      </div>
      {selectedIndex !== null && (
        <p className="mt-4 text-gray-700">
          You rated: {items[selectedIndex].description}
        </p>
      )}
    </div>
  );
};

export default ImageRating;
