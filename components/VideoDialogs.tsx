"use client";

import { useOptimistic, useState, startTransition } from "react";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import {
  deleteVideo,
  updateVideoDetails,
  updateVideoVisibility,
} from "@/lib/actions/video";
import { updateFormSchema } from "@/lib/utils";

export function EditDialog({
  recording,
  onClose,
}: {
  recording: typeof videos.$inferSelect;
  onClose: () => void;
}) {
  const form = useForm<z.infer<typeof updateFormSchema>>({
    resolver: zodResolver(updateFormSchema),
    defaultValues: {
      title: recording.title,
      description: recording.description,
      visibility: recording.visibility,
      videoId: recording.videoId,
    },
  });

  const onSubmit = async (values: z.infer<typeof updateFormSchema>) => {
    const { data, error } = await updateVideoDetails(values);
    if (!data || error) {
      toast.error(error);
      return;
    }
    toast.success("Video details updated successfully");
    form.reset();
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Edit Recording</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="my-6">
            <Label htmlFor="title" className="mb-3 text-primary">
              Title
            </Label>
            <Input
              id="title"
              placeholder="Enter a clear and concise video title"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-red-500 mt-2">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="my-6">
            <Label htmlFor="description" className="mb-2">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Add a description for your video..."
              rows={3}
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-500 mt-2">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="my-6 flex items-center gap-4">
            <div>
              <Label className="text-base font-medium">Public</Label>
            </div>
            <Controller
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <Switch
                  checked={field.value === "public"}
                  onCheckedChange={(checked) =>
                    field.onChange(checked ? "public" : "private")
                  }
                  className="data-checked:bg-sky-100 cursor-pointer"
                />
              )}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={form.formState.isSubmitting}
              type="submit"
              className="bg-sky-100 disabled::bg-sky-100/50 hover:bg-sky-100/80 text-primary-foreground"
            >
              {form.formState.isSubmitting ? "Updating..." : "Update"}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDialog({
  id,
  thumbnailId,
  onClose,
}: {
  id: string;
  thumbnailId: string;
  onClose: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const removeRecording = async () => {
    setIsDeleting(true);
    const { error } = await deleteVideo(id, thumbnailId);
    if (error) {
      toast.error(error);
      setIsDeleting(false);
      return;
    }
    setIsDeleting(false);
    toast.success("Video deleted successfully");
    onClose();
  };

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
          <AlertDialogCancel>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={removeRecording}
          >
            {isDeleting ? "Deleting..." : "Delete"}
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
  const [visibility, setVisibility] = useState(
    recording.visibility === "public",
  );
  const [publicVideoId, setPublicVideoId] = useState(recording.publicVideoId);
  const [optimisticVisibility, setOptimisticVisibility] =
    useOptimistic(visibility);

  const publicUrl = publicVideoId
    ? `${window.location.origin}/share/${publicVideoId}`
    : "Generating link...";
  const privateUrl = `${window.location.origin}/view/${recording.videoId}`;

  const copyUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Copied!", {
      description: `${label} link copied to clipboard`,
    });
  };

  const handleVisibilityChange = (isPublic: boolean) => {
    const newVisibility = isPublic ? "public" : "private";
    startTransition(async () => {
      setOptimisticVisibility(isPublic);
      const { data, error } = await updateVideoVisibility(
        recording.videoId,
        newVisibility,
      );
      if (!data || error) {
        toast.error(error);
        return;
      }
      startTransition(() => {
        setVisibility(data.visibility === "public");
        if (data.publicVideoId) {
          setPublicVideoId(data.publicVideoId);
        }
      });
      toast.success("Video visibility updated successfully");
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
              checked={optimisticVisibility}
              onCheckedChange={handleVisibilityChange}
              // disabled={optimisticVisibility !== visibility}
              className="data-checked:bg-sky-100 cursor-pointer"
            />
          </div>

          {optimisticVisibility && (
            <div className="space-y-2">
              <Label>Public URL</Label>
              <div className="flex gap-2">
                <Input value={publicUrl} readOnly className="text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!publicVideoId}
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
