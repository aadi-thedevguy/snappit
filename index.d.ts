declare interface User {
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  id: string;
}

declare interface VideoFormValues {
  title: string;
  description: string;
  visibility: "public" | "private";
  thumbnailUrl: string;
}

declare interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  placeholder?: string;
  as?: "input" | "textarea" | "select";
  options?: Array<{ value: string; label: string }>;
}

declare interface FileInputProps {
  id: string;
  label: string;
  accept: string;
  file: File | null;
  previewUrl: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  type: "video" | "image";
}

declare interface NavbarProps {
  user: User | undefined;
}

declare interface SearchResult {
  video: {
    id: string;
    videoId: string;
    title: string;
    thumbnailUrl: string;
  };
  user: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

declare interface VideoCardProps {
  id: string;
  title: string;
  thumbnail: string;
  userImg: string;
  username: string;
  createdAt: Date;
  views: number;
  visibility: Visibility;
  duration: number | null;
}

declare interface VideoDetailHeaderProps {
  title: string;
  userImg: string | null | undefined;
  username?: string;
  videoId: string;
  publicVideoId?: string;
  ownerId: string;
  visibility: string;
  thumbnailUrl: string;
  createdAt: Date;
}

declare interface VideoPlayerProps {
  videoId: string;
  className?: string;
}
declare interface VideoInfoProps {
  title: string;
  createdAt: Date;
  description: string;
  videoId: string;
  videoUrl: string;
  shareable?: boolean;
}

declare interface ImageWithFallbackProps extends Omit<ImageProps, "src"> {
  fallback?: string;
  alt: string;
  src: string | null;
}

type Visibility = "public" | "private";

declare interface VideoDetails {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  visibility: Visibility;
  duration?: number | null;
}

declare interface VideoWithUserResult {
  video: {
    id: string;
    videoId: string;
    videoPublicId: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    videoUrl: string;
    userId: string;
    views: number;
    visibility: Visibility;
    createdAt: Date;
    updatedAt: Date;
  };
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

declare interface VideoObject {
  id: string;
  videoId: string;
  videoPublicId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  userId: string;
  views: number;
  visibility: Visibility;
  createdAt: Date;
  updatedAt: Date;
}

declare interface UserWithVideos {
  user: {
    id: string;
    name: string | null;
    image: string | null;
    email: string | null;
  };
  videos: VideoObject[];
  count: number;
}

declare interface ExtendedMediaStream extends MediaStream {
  _originalStreams?: MediaStream[];
}

declare interface SharedHeaderProps {
  subHeader: string;
  title: string;
  userImg?: string;
}

declare interface SharedHeaderProps {
  subHeader: string;
  title: string;
  userImg?: string;
}

declare interface Params {
  params: Promise<Record<string, string>>;
}

declare interface SearchParams {
  searchParams: Promise<Record<string, string | undefined>>;
}

declare interface ParamsWithSearch {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string | undefined>>;
}

declare interface DropdownListProps {
  options: string[];
  selectedOption: string;
  onOptionSelect: (option: string) => void;
  triggerElement: ReactNode;
}

declare interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
}

declare interface MediaStreams {
  displayStream: MediaStream;
  micStream: MediaStream | null;
  hasDisplayAudio: boolean;
}

declare interface BunnyRecordingState {
  isRecording: boolean;
  recordedBlob: Blob | null;
  recordedVideoUrl: string;
  recordingDuration: number;
}

declare interface ExtendedMediaStream extends MediaStream {
  _originalStreams?: MediaStream[];
}

// Types
interface VideoQueryResult {
  video: typeof videos.$inferSelect;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface PaginationResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number | unknown;
  };
}

declare interface RecordingHandlers {
  onDataAvailable: (e: BlobEvent) => void;
  onStop: () => void;
}
