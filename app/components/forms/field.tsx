import { PropsWithChildren } from "react";

type Field = PropsWithChildren<{
  label: string;
  name: string;
}>;

export const Field: React.FC<Field> = ({ label, name, children }) => {
  return (
    <div className="space-y-2 w-full flex flex-col">
      <label htmlFor={name} className="text-sm font-medium text-gray-300">
        {label}
      </label>
      {children}
    </div>
  );
};
