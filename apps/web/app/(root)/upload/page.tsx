"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, ImageIcon, Monitor, Video } from "lucide-react";
import { toast } from "sonner";
import { beginRecordingUpload, finalizeRecordingUpload } from "@/lib/actions/video";
import { DEFAULT_RECORDING_DESCRIPTION, MAX_THUMBNAIL_SIZE } from "@/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  clearPendingUpload,
  getPendingUpload,
  setPendingUploadVideoId,
} from "@/lib/hooks/videoStore";
import { uploadRecordingFiles } from "@/lib/storage/uploadRecordingFiles";
import { generateThumbnail } from "@/lib/hooks/generateThumbnail";
import { createDefaultRecordingTitle } from "@/lib/utils";
import { formSchema } from "@/lib/utils";

export default function UploadPage() {
  const router = useRouter();
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const pendingVideoIdRef = useRef<string | undefined>(undefined);
  const [recording, setRecording] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loadingRecording, setLoadingRecording] = useState(true);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: createDefaultRecordingTitle(),
      description: DEFAULT_RECORDING_DESCRIPTION,
      visibility: "public",
      duration: 0,
    },
  });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const pending = await getPendingUpload();
        if (!active) return;
        if (!pending || pending.blob.type.split(";")[0] !== "video/webm" || !pending.blob.size) {
          setLoadingRecording(false);
          return;
        }
        const file = new File([pending.blob], "recording.webm", {
          type: "video/webm",
        });
        setRecording(file);
        pendingVideoIdRef.current = pending.videoId;
        if (pending.title && !form.getFieldState("title").isDirty) {
          form.setValue("title", pending.title);
        }
        setDuration(Math.floor(pending.duration));
        form.setValue("duration", Math.floor(pending.duration));
        const preview = URL.createObjectURL(file);
        setObjectUrl(preview);
        const generated = await generateThumbnail(file);
        if (!active) return;
        if (generated) {
          const image = new File([generated], "thumbnail.jpg", {
            type: "image/jpeg",
          });
          setThumbnail(image);
          setThumbnailUrl(URL.createObjectURL(image));
        }
      } catch (error) {
        console.error("Unable to load pending recording:", error);
      } finally {
        if (active) setLoadingRecording(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [form]);

  useEffect(
    () => () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    },
    [objectUrl],
  );

  useEffect(
    () => () => {
      if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    },
    [thumbnailUrl],
  );

  const selectThumbnail = (file?: File) => {
    if (!file) return;
    if (file.type !== "image/jpeg" || file.size > MAX_THUMBNAIL_SIZE) {
      toast.error("Choose a JPEG thumbnail under the size limit.");
      return;
    }
    setThumbnail(file);
    setThumbnailUrl(URL.createObjectURL(file));
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!recording) {
      form.setError("root", {
        message: "No recording is ready to upload. Record a video first.",
      });
      return;
    }
    if (!thumbnail) {
      form.setError("root", { message: "Choose a JPEG thumbnail before saving your recording." });
      return;
    }
    try {
      form.clearErrors("root");
      const begun = await beginRecordingUpload({
        ...values,
        duration,
        videoId: pendingVideoIdRef.current,
      });
      if (!begun.data || begun.error)
        throw new Error(begun.error || "Could not begin the recording upload.");
      pendingVideoIdRef.current = begun.data.videoId;
      await setPendingUploadVideoId(begun.data.videoId);
      await uploadRecordingFiles(recording, thumbnail, begun.data);
      const finalized = await finalizeRecordingUpload({
        ...values,
        duration,
        videoId: begun.data.videoId,
      });
      if (!finalized.data || finalized.error)
        throw new Error(finalized.error || "Could not verify the recording upload.");
      await clearPendingUpload();
      router.push(`/video/${finalized.data.videoId}`);
    } catch (error) {
      console.error("Recording upload failed:", error);
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Recording upload failed. Please try again.",
      });
    }
  };

  if (loadingRecording)
    return (
      <main className="container mx-auto max-w-2xl px-4 py-12 text-center">Loading recording…</main>
    );
  if (!recording)
    return (
      <main className="container mx-auto max-w-2xl px-4 py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Monitor className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-display font-bold">No recording is ready to upload</h1>
        <p className="mt-2 text-muted-foreground">
          Record your screen with Snappit, then return here to save it.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link href="/record">Go to recording</Link>
        </Button>
      </main>
    );

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-display font-bold">Save your recording</h1>
      <Card className="border-border shadow-card">
        <CardContent className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {form.formState.errors.root && (
              <Alert variant="destructive" className="my-4">
                <AlertCircleIcon />
                <AlertTitle>Upload failed</AlertTitle>
                <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
              </Alert>
            )}
            <div className="my-6">
              <Label htmlFor="title" className="mb-3">
                Title
              </Label>
              <Input id="title" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="mt-2 text-sm text-red-500">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="my-6">
              <Label htmlFor="description" className="mb-2">
                Description
              </Label>
              <Textarea id="description" rows={3} {...form.register("description")} />
              {form.formState.errors.description && (
                <p className="mt-2 text-sm text-red-500">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>
            <div className="my-6 overflow-hidden rounded-2xl border border-border bg-foreground/5">
              <video
                src={objectUrl ?? undefined}
                className="aspect-video w-full object-contain"
                controls
                controlsList="nodownload"
                preload="metadata"
                onLoadedMetadata={(event) => {
                  const value = event.currentTarget.duration;
                  if (Number.isFinite(value) && value > 0 && duration <= 0) {
                    setDuration(Math.floor(value));
                    form.setValue("duration", Math.floor(value));
                  }
                }}
              />
            </div>
            <div className="my-6">
              <Label className="mb-3">Thumbnail</Label>
              {thumbnailUrl ? (
                <div className="relative aspect-video overflow-hidden rounded-2xl border border-border">
                  <Image
                    src={thumbnailUrl}
                    alt="Recording thumbnail"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove custom thumbnail"
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="absolute right-2 top-2 rounded-full bg-foreground/60 p-1.5 text-background"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border p-10 text-muted-foreground"
                >
                  <ImageIcon className="h-8 w-8" />
                  Choose a JPEG thumbnail
                </button>
              )}
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/jpeg"
                className="hidden"
                onChange={(event) => selectThumbnail(event.target.files?.[0])}
              />
            </div>
            <div className="my-6 flex items-center gap-4">
              <Label htmlFor="public-video" className="text-base font-medium">
                Public
              </Label>
              <Controller
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <Switch
                    id="public-video"
                    className="data-checked:bg-sky-100 cursor-pointer"
                    checked={field.value === "public"}
                    onCheckedChange={(checked) => field.onChange(checked ? "public" : "private")}
                  />
                )}
              />
            </div>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || !recording || !thumbnail}
              className="w-full gap-2 rounded-full bg-sky-100 px-3 py-6 hover:bg-sky-100/80"
              size="lg"
            >
              <Video className="h-5 w-5" />
              {form.formState.isSubmitting ? "Uploading…" : "Save recording"}
            </Button>
            {!thumbnail && (
              <p className="mt-2 text-sm text-muted-foreground">
                A thumbnail could not be generated. Choose a JPEG to continue.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
