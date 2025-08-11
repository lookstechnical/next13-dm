import { PropsWithChildren } from "react";

type Field = PropsWithChildren<{
  label: string;
  name: string;
  errors: any;
}>;

export const Field: React.FC<Field> = ({ label, name, children, errors }) => {
  return (
    <div className="space-y-2 w-full flex flex-col">
      <label htmlFor={name} className="text-sm font-medium text-gray-300">
        {label}
      </label>
      {children}
      {errors && errors?.properties[name] && (
        <p className="text-sm text-destructive">
          {errors?.properties[name].errors[0]}
        </p>
      )}
    </div>
  );
};
