import { Loader } from "lucide-react";
import { Button, ButtonProps } from "./button";
import { useNavigation } from "@remix-run/react";
import { cn } from "~/lib/utils";

type ActionButton = {
  title: string;
} & ButtonProps;

const ActionButton: React.FC<ActionButton> = ({
  variant = "secondary",
  disabled,
  title,
  className,
}) => {
  const navigation = useNavigation();

  return (
    <Button
      type="submit"
      variant={variant}
      className={cn("text-white", className)}
      disabled={disabled || navigation.state === "submitting"}
    >
      {navigation.state === "submitting" && (
        <Loader className="rotate animate" />
      )}
      {navigation.state !== "submitting" ? title : ""}
    </Button>
  );
};

export default ActionButton;
