"use client";

import { useState, ChangeEvent, useEffect, useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  getVideoUploadUrl,
  getThumbnailUploadUrl,
  saveVideoDetails,
} from "@/lib/actions/video";
import { useRouter } from "next/navigation";
import { useFileInput } from "@/lib/hooks/useFileInput";
import { MAX_THUMBNAIL_SIZE, MAX_VIDEO_SIZE } from "@/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircleIcon, ImageIcon, UploadIcon, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";

const uploadFileToStorage = async (
  file: File,
  uploadUrl: string,
): Promise<void> => {
  try {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });
    if (!response.ok)
      throw new Error(`Upload failed with status ${response.status}`);
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
};

const formSchema = z.object({
  title: z
    .string()
    .min(5, "Video title must be at least 5 characters.")
    .max(100, "Video title must be at most 100 characters."),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters.")
    .max(500, "Description must be at most 500 characters."),
  visibility: z.enum(["public", "private"]),
});

const UploadPage = () => {
  const router = useRouter();
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      visibility: "public",
    },
  });

  const video = useFileInput(MAX_VIDEO_SIZE);
  const thumbnail = useFileInput(MAX_THUMBNAIL_SIZE);

  useEffect(() => {
    if (video.duration !== null) {
      setVideoDuration(video.duration);
    }
  }, [video.duration]);

  useEffect(() => {
    const checkForRecordedVideo = async () => {
      try {
        const stored = sessionStorage.getItem("recordedVideo");
        if (!stored) return;

        const { url, name, type, duration, thumbnailUrl } = JSON.parse(stored);
        const blob = await fetch(url).then((res) => res.blob());
        const file = new File([blob], name, { type, lastModified: Date.now() });

        const now = new Date();
        const formattedDate = now.toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        form.setValue("title", `Snappit - ${formattedDate}`);
        form.setValue(
          "description",
          `This video has been recorded by Snappit. Generate yours at snappit.adityakhare.com`,
        );

        if (video.inputRef.current) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          video.inputRef.current.files = dataTransfer.files;

          const event = new Event("change", { bubbles: true });
          video.inputRef.current.dispatchEvent(event);

          video.handleFileChange({
            target: { files: dataTransfer.files },
          } as ChangeEvent<HTMLInputElement>);
        }

        if (thumbnailUrl) {
          try {
            const response = await fetch(thumbnailUrl);
            const blob = await response.blob();

            const thumbnailFile = new File([blob], "thumbnail.jpg", {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            if (thumbnail.inputRef.current) {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(thumbnailFile);
              thumbnail.inputRef.current.files = dataTransfer.files;

              thumbnail.handleFileChange({
                target: { files: dataTransfer.files },
              } as ChangeEvent<HTMLInputElement>);
            }
          } catch (error) {
            console.error("Error setting thumbnail file:", error);
          }
        }

        if (duration) setVideoDuration(duration);

        sessionStorage.removeItem("recordedVideo");
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Error loading recorded video:", err);
      }
    };

    checkForRecordedVideo();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (!video.file || !thumbnail.file) {
        form.setError("root", {
          message: "Please upload video and thumbnail files.",
        });
        return;
      }

      const { videoId, uploadUrl: videoUploadUrl } = await getVideoUploadUrl();

      if (!videoUploadUrl)
        throw new Error("Failed to get video upload credentials");

      await uploadFileToStorage(video.file, videoUploadUrl);

      const { uploadUrl: thumbnailUploadUrl, cdnUrl: thumbnailCdnUrl } =
        await getThumbnailUploadUrl(videoId);

      if (!thumbnailUploadUrl || !thumbnailCdnUrl)
        throw new Error("Failed to get thumbnail upload credentials");

      await uploadFileToStorage(thumbnail.file, thumbnailUploadUrl);

      await saveVideoDetails({
        videoId,
        ...values,
        thumbnailUrl: thumbnailCdnUrl,
        duration: videoDuration,
      });

      router.push(`/video/${videoId}`);
    } catch (error) {
      console.error("Error submitting form:", error);
      form.setError("root", {
        message: "An error occurred during upload. Please try again.",
      });
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent, isThumbnail: boolean = false) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (isThumbnail) {
        if (!droppedFile || !droppedFile.type.startsWith("image/")) {
          toast.error("Invalid file", {
            description: "Please select an image file",
          });
          return;
        }
        thumbnail.handleFileChange(e);
        return;
      }
      if (!droppedFile || !droppedFile.type.startsWith("video/")) {
        toast.error("Invalid file", {
          description: "Please select a video file",
        });
        return;
      }
      video.handleFileChange(e);
      if (!form.getValues("title")) {
        form.setValue("title", droppedFile.name.replace(/\.[^.]+$/, ""));
      }
    },
    [video, thumbnail, form],
  );

  return (
    <main className="container mx-auto px-4 max-w-2xl py-8">
      <h1 className="text-3xl font-display font-bold text-foreground mb-8">
        Upload a video
      </h1>

      <Card className="shadow-card border-border">
        <CardContent className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Error Alert */}
            {form.formState.errors.root && (
              <Alert variant="destructive" className="my-4">
                <AlertCircleIcon />
                <AlertTitle>Upload Failed</AlertTitle>
                <AlertDescription>
                  {form.formState.errors.root.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Title */}
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

            {/* Video upload */}
            <div className="my-6">
              <Label htmlFor="video" className="mb-3">
                Video
              </Label>
              {video.file ? (
                <div className="relative rounded-2xl border border-border overflow-hidden bg-foreground/5">
                  <video
                    src={video.previewUrl ?? undefined}
                    className="w-full aspect-video object-contain"
                    controls
                  />
                  <button
                    onClick={video.resetFile}
                    className="cursor-pointer absolute top-2 right-2 p-1.5 rounded-full bg-foreground/60 text-background hover:bg-foreground/80 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-sky-100/50 hover:bg-sky-100/5 transition-colors"
                  onClick={() => video.inputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  <UploadIcon className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground font-medium">
                    click to upload your video
                  </p>
                </div>
              )}
              <input
                ref={video.inputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  video.handleFileChange(e);
                  const file = e.target.files?.[0];
                  if (file && !form.getValues("title")) {
                    form.setValue("title", file.name.replace(/\.[^.]+$/, ""));
                  }
                }}
              />
            </div>

            <div className="my-6">
              <Label className="mb-3">Thumbnail</Label>
              {thumbnail.file ? (
                <div className="relative w-full aspect-video rounded-2xl border border-border overflow-hidden bg-foreground/5">
                  <Image
                    src={thumbnail.previewUrl ?? ""}
                    alt="Selected thumbnail"
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={thumbnail.resetFile}
                    className="cursor-pointer absolute top-2 right-2 p-1.5 rounded-full bg-foreground/60 text-background hover:bg-foreground/80 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-sky-100/50 hover:bg-sky-100/5 transition-colors"
                  onClick={() => thumbnail.inputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, true)}
                >
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground font-medium">
                    click to upload a custom thumbnail
                  </p>
                </div>
              )}
              <input
                ref={thumbnail.inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={thumbnail.handleFileChange}
              />
            </div>

            <div className="my-6">
              <Label className="mb-3">Visibility</Label>
              <Controller
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full px-2 py-4 rounded-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="w-full rounded-xl">
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Upload button */}
            <Button
              type="submit"
              disabled={!video.file || form.formState.isSubmitting}
              className="bg-sky-100 hover:bg-sky-100/80 px-3 py-6 w-full rounded-full gap-2 shadow-elegant"
              size="lg"
            >
              <Video className="h-5 w-5" />
              {form.formState.isSubmitting ? "Uploading..." : "Upload Video"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default UploadPage;
