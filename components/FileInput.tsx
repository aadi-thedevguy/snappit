import { Upload, X } from "lucide-react";
import Image from "next/image";

const FileInput = ({
  id,
  label,
  accept,
  file,
  previewUrl,
  inputRef,
  onChange,
  onReset,
  type,
}: FileInputProps) => (
  <section className="file-input">
    <label htmlFor={id}>{label}</label>
    <input
      type="file"
      id={id}
      accept={accept}
      hidden
      ref={inputRef}
      onChange={onChange}
    />

    {!previewUrl ? (
      <figure onClick={() => inputRef.current?.click()}>
        <Upload className="w-4 h-4" />
        <p>click to upload your {id}</p>
      </figure>
    ) : (
      <div>
        {type === "video" ? (
          <video src={previewUrl} controls />
        ) : (
          <Image src={previewUrl} alt={`Selected ${id}`} fill />
        )}
        <button type="button" onClick={onReset}>
          <X className="w-4 h-4 " />
        </button>
        <p>{file?.name}</p>
      </div>
    )}
  </section>
);

export default FileInput;
