"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  getVideoUploadUrl,
  getThumbnailUploadUrl,
  saveVideoDetails,
} from "@/lib/actions/video";
import { useRouter } from "next/navigation";
import { MAX_THUMBNAIL_SIZE, MAX_VIDEO_SIZE } from "@/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircleIcon, ImageIcon, UploadIcon, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { clearPendingUpload, getPendingUpload } from "@/lib/hooks/videoStore";
import { generateThumbnail } from "@/lib/hooks/generateThumbnail";
import { formSchema } from "@/lib/utils";

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

const UploadPage = () => {
  const router = useRouter();
  const date = new Date();
  const formattedDate = date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: `Snappit - ${formattedDate}`,
      description:
        "This video has been recorded by Snappit. Generate yours at snappit.adityakhare.com",
      visibility: "private",
      duration: 0,
    },
  });

  // Video state & refs
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const videoUrlRef = useRef<string | null>(null);

  // Thumbnail state & refs
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(
    null,
  );
  const thumbnailUrlRef = useRef<string | null>(null);

  const setSafeVideoPreviewUrl = useCallback((url: string | null) => {
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    videoUrlRef.current = url;
    setVideoPreviewUrl(url);
  }, []);

  const setSafeThumbnailPreviewUrl = useCallback((url: string | null) => {
    if (thumbnailUrlRef.current) URL.revokeObjectURL(thumbnailUrlRef.current);
    thumbnailUrlRef.current = url;
    setThumbnailPreviewUrl(url);
  }, []);

  // Cleanup object URLs safely on component unmount
  useEffect(() => {
    return () => {
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
      if (thumbnailUrlRef.current) URL.revokeObjectURL(thumbnailUrlRef.current);
    };
  }, []);

  // File Select Handlers
  const handleVideoSelect = useCallback(
    (file: File | undefined) => {
      if (!file) {
        setVideoFile(null);
        setSafeVideoPreviewUrl(null);
        return;
      }
      if (file.size > MAX_VIDEO_SIZE) {
        toast.error("File is too large", {
          description: `The maximum file size is ${MAX_VIDEO_SIZE / 1024 / 1024}MB.`,
        });
        if (videoInputRef.current) videoInputRef.current.value = "";
        setVideoFile(null);
        setSafeVideoPreviewUrl(null);
        return;
      }
      setVideoFile(file);
      setSafeVideoPreviewUrl(URL.createObjectURL(file));

      if (!form.getValues("title")) {
        form.setValue("title", file.name.replace(/\.[^.]+$/, ""));
      }
    },
    [form, setSafeVideoPreviewUrl],
  );

  const handleThumbnailSelect = useCallback(
    (file: File | undefined) => {
      if (!file) {
        setThumbnailFile(null);
        setSafeThumbnailPreviewUrl(null);
        return;
      }
      if (file.size > MAX_THUMBNAIL_SIZE) {
        toast.error("File is too large", {
          description: `The maximum file size is ${MAX_THUMBNAIL_SIZE / 1024 / 1024}MB.`,
        });
        if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
        setThumbnailFile(null);
        setSafeThumbnailPreviewUrl(null);
        return;
      }
      setThumbnailFile(file);
      setSafeThumbnailPreviewUrl(URL.createObjectURL(file));
    },
    [setSafeThumbnailPreviewUrl],
  );

  const resetVideo = useCallback(() => {
    setVideoFile(null);
    setSafeVideoPreviewUrl(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  }, [setSafeVideoPreviewUrl]);

  const resetThumbnail = useCallback(() => {
    setThumbnailFile(null);
    setSafeThumbnailPreviewUrl(null);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  }, [setSafeThumbnailPreviewUrl]);

  const generateAndSetThumbnail = async (videoBlob: Blob) => {
    try {
      const thumbnailBlob = await generateThumbnail(videoBlob);
      if (thumbnailBlob) {
        const thumbnailFile = new File([thumbnailBlob], "thumbnail.jpg", {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        if (thumbnailInputRef.current) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(thumbnailFile);
          thumbnailInputRef.current.files = dataTransfer.files;
        }
        handleThumbnailSelect(thumbnailFile);
      }
    } catch (err) {
      console.error("Error generating thumbnail:", err);
      // thumbnail will be generated at upload time as fallback
    }
  };

  // Check IndexedDB for a pending recording on mount
  const getDataFromStorage = async () => {
    const pending = await getPendingUpload();
    if (pending) {
      const file = new File([pending.blob], "recording.webm", {
        type: "video/webm",
        lastModified: Date.now(),
      });
      if (videoInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        videoInputRef.current.files = dataTransfer.files;
      }
      handleVideoSelect(file);

      form.setValue("duration", pending.duration);
      await generateAndSetThumbnail(pending.blob);
      await clearPendingUpload();
      return;
    }

    // Check for extension data via query param
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("from") === "extension" &&
      (window as any).chrome?.storage?.local
    ) {
      (window as any).chrome.storage.local.get(
        "pendingRecording",
        (result: any) => {
          if (result?.pendingRecording) {
            const { dataUrl, duration: extDuration } = result.pendingRecording;
            fetch(dataUrl)
              .then((r) => r.blob())
              .then(async (b) => {
                const file = new File([b], "recording.webm", {
                  type: "video/webm",
                  lastModified: Date.now(),
                });
                if (videoInputRef.current) {
                  const dataTransfer = new DataTransfer();
                  dataTransfer.items.add(file);
                  videoInputRef.current.files = dataTransfer.files;
                }
                handleVideoSelect(file);

                form.setValue("duration", extDuration);
                await generateAndSetThumbnail(b);
                (window as any).chrome.storage.local.remove("pendingRecording");
              });
          }
        },
      );
    }
  };

  useEffect(() => {
    getDataFromStorage();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (!videoFile || !thumbnailFile) {
        form.setError("root", {
          message: "Please upload video and thumbnail files.",
        });
        return;
      }

      const { data, error } = await getVideoUploadUrl();
      if (!data || error) {
        form.setError("root", {
          message: error || "Failed to retrieve video upload URL.",
        });
        return;
      }

      const { videoId, uploadUrl: videoUploadUrl } = data;
      await uploadFileToStorage(videoFile, videoUploadUrl);

      const { data: thumbnailData, error: thumbnailError } =
        await getThumbnailUploadUrl(videoId);

      if (!thumbnailData || thumbnailError) {
        form.setError("root", {
          message: thumbnailError || "Failed to retrieve thumbnail upload URL.",
        });
        return;
      }
      const { uploadUrl: thumbnailUploadUrl, cdnUrl: thumbnailCdnUrl } =
        thumbnailData;
      await uploadFileToStorage(thumbnailFile, thumbnailUploadUrl);

      await saveVideoDetails({
        videoId,
        ...values,
        thumbnailUrl: thumbnailCdnUrl,
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
        handleThumbnailSelect(droppedFile);
        return;
      }
      if (!droppedFile || !droppedFile.type.startsWith("video/")) {
        toast.error("Invalid file", {
          description: "Please select a video file",
        });
        return;
      }
      handleVideoSelect(droppedFile);
    },
    [handleThumbnailSelect, handleVideoSelect],
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
              {videoFile ? (
                <div className="relative rounded-2xl border border-border overflow-hidden bg-foreground/5">
                  <video
                    src={videoPreviewUrl ?? undefined}
                    className="w-full aspect-video object-contain"
                    controls
                  />
                  <button
                    type="button"
                    onClick={resetVideo}
                    className="cursor-pointer absolute top-2 right-2 p-1.5 rounded-full bg-foreground/60 text-background hover:bg-foreground/80 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-sky-100/50 hover:bg-sky-100/5 transition-colors"
                  onClick={() => videoInputRef.current?.click()}
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
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => handleVideoSelect(e.target.files?.[0])}
              />
            </div>

            <div className="my-6">
              <Label className="mb-3">Thumbnail</Label>
              {thumbnailFile ? (
                <div className="relative w-full aspect-video rounded-2xl border border-border overflow-hidden bg-foreground/5">
                  <Image
                    src={thumbnailPreviewUrl ?? ""}
                    alt="Selected thumbnail"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={resetThumbnail}
                    className="cursor-pointer absolute top-2 right-2 p-1.5 rounded-full bg-foreground/60 text-background hover:bg-foreground/80 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-sky-100/50 hover:bg-sky-100/5 transition-colors"
                  onClick={() => thumbnailInputRef.current?.click()}
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
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleThumbnailSelect(e.target.files?.[0])}
              />
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

            {/* Upload button */}
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
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
