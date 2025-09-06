import { Input } from "~/components/ui/input";
import { Field } from "../field";

type CommentForm = {
  parentId: string;
};

export const CommentForm = ({ parentId }: CommentForm) => {
  return (
    <div className="w-full">
      <input type="hidden" name="parentId" value={parentId} />
      <Field name="comment" label="Comment">
        <Input name="comment" />
      </Field>
    </div>
  );
};
