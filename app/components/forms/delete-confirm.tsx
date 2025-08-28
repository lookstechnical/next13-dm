import { X } from "lucide-react";
import {
  Dialog,
  DialogFooter,
  DialogTrigger,
  DialogContent,
  DialogClose,
} from "../ui/dialog";
import { Form } from "@remix-run/react";
import ActionButton from "../ui/action-button";
import { Button } from "../ui/button";
import { FC, PropsWithChildren } from "react";
import { DialogDescription, DialogTitle } from "@radix-ui/react-dialog";

type DeleteConfirm = {
  name: string;
  id: string;
  term?: string;
};

export const DeleteConfirm: FC<PropsWithChildren<DeleteConfirm>> = ({
  name,
  id,
  term = "Delete",
  children,
}) => {
  return (
    <>
      <Dialog>
        <DialogTrigger asChild>{children ? children : <X />}</DialogTrigger>
        <DialogContent className="text-foreground">
          <DialogTitle className="sr-only">Confirm Delete</DialogTitle>
          <DialogDescription className="sr-only">
            Confirm Delete
          </DialogDescription>

          <div>
            Please confirm you would like to {term} {name}
          </div>
          <Form method="DELETE">
            <input type="hidden" value={id} name="id" />
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
              <ActionButton title="Confirm" />
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};
