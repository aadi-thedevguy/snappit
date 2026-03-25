"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { videos } from "@/drizzle/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Copy } from "lucide-react";

export function EditDialog({
  recording,
  onClose,
}: {
  recording: typeof videos.$inferSelect;
  onClose: () => void;
}) {
  // const update = useUpdateRecording();
  const [title, setTitle] = useState(recording.title);
  const [description, setDescription] = useState(recording.description || "");
  const [isPublic, setIsPublic] = useState(recording.visibility === "public");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Edit Recording</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Public</Label>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            // onClick={handleSave}
            // disabled={update.isPending}
            className="gradient-primary text-primary-foreground"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDialog({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  // const del = useDeleteRecording();

  if (!id) return null;

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">
            Delete Recording
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The recording will be permanently
            deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            // onClick={() => del.mutate(id, { onSuccess: onClose })}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ShareDialog({
  recording,
  onClose,
}: {
  recording: typeof videos.$inferSelect;
  onClose: () => void;
}) {
  // const update = useUpdateRecording();
  const publicUrl = `${window.location.origin}/share/${recording.publicVideoId}`;
  const privateUrl = `${window.location.origin}/view/${recording.videoId}`;

  const copyUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Copied!", {
      description: `${label} link copied to clipboard`,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Share Recording</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Public access</p>
              <p className="text-sm text-muted-foreground">
                Anyone with the link can view
              </p>
            </div>
            <Switch
              checked={recording.visibility === "public"}
              // onCheckedChange={(checked) =>
              // update.mutate({ id: recording.id, is_public: checked })
              // }
            />
          </div>

          {recording.visibility === "public" && (
            <div className="space-y-2">
              <Label>Public URL</Label>
              <div className="flex gap-2">
                <Input value={publicUrl} readOnly className="text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyUrl(publicUrl, "Public")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Private URL</Label>
            <p className="text-xs text-muted-foreground">
              Only accessible with this specific link
            </p>
            <div className="flex gap-2">
              <Input value={privateUrl} readOnly className="text-sm" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyUrl(privateUrl, "Private")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
