"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Archive } from "lucide-react";

type ArchiveLeadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason?: string) => Promise<void>;
  leadName?: string;
  multiple?: boolean;
  leadCount?: number;
};

export function ArchiveLeadDialog({
  open,
  onOpenChange,
  onConfirm,
  leadName,
  multiple = false,
  leadCount = 1,
}: ArchiveLeadDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm(reason || undefined);
      setReason("");
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archive {multiple ? `${leadCount} Leads` : "Lead"}
          </DialogTitle>
          <DialogDescription>
            {multiple
              ? `Archive ${leadCount} leads? They will be hidden from the pipeline but can be restored later.`
              : `Archive ${leadName || "this lead"}? The lead will be hidden from the pipeline but can be restored later.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Lost to competitor, No longer interested, Out of budget..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Adding a reason helps track why leads were archived
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            variant="destructive"
          >
            {isSubmitting ? "Archiving..." : "Archive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
