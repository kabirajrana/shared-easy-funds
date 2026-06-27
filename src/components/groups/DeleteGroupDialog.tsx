import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeleteGroupDialog({
  groupName,
  onDelete,
  triggerLabel = "Delete group",
  pending = false,
  triggerClassName,
}: {
  groupName: string;
  onDelete: () => void | Promise<void>;
  triggerLabel?: string;
  pending?: boolean;
  triggerClassName?: string;
}) {
  const [confirmation, setConfirmation] = useState("");
  const confirmed = confirmation.trim() === groupName.trim();
  const isDisabled = !confirmed || pending;

  useEffect(() => {
    setConfirmation("");
  }, [groupName]);

  return (
    <AlertDialog onOpenChange={(open) => !open && setConfirmation("")}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" className={triggerClassName}>
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this group?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span>This will permanently remove the group, its members, and its expenses from your workspace.</span>
            <span className="block font-medium text-[var(--saj-text)]">
              Type <span className="font-semibold">{groupName}</span> below to confirm.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <p className="text-[12px] font-medium text-[var(--saj-muted)]">
            This action is final and should only be used when you are sure.
          </p>
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={`Type ${groupName}`}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => void onDelete()} disabled={isDisabled}>
            {pending ? "Deleting..." : "Delete group"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
