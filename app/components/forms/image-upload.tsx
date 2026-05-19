import { User, Volleyball } from "lucide-react";
import { useState } from "react";
import { cn } from "~/lib/utils";

type ImageUploadProps = {
  image: string;
  isProfile?: boolean;
  name?: string;
  errors?: any;
  accept?: string;
};

async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 1024;
    let { width, height } = bitmap;
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85);
    });
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  image,
  errors,
  isProfile,
  name = "avatar",
  accept = "image/*",
}) => {
  const [previewUrl, setPreviewUrl] = useState(image);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (accept === "image/*" && file.type.startsWith("image/")) {
      const compressed = await compressImage(file);
      const dt = new DataTransfer();
      dt.items.add(compressed);
      e.target.files = dt.files;
      setPreviewUrl(URL.createObjectURL(compressed));
    } else {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="w-full">
      <div className={cn("relative mb-4", isProfile ? "w-32 h-32" : "w-full ")}>
        <label
          htmlFor={name}
          className="text-white p-2 rounded-full cursor-pointer shadow-lg transition "
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Profile preview"
              className={cn(
                "object-cover border-4 border-gray-300 shadow",
                isProfile ? "w-32 h-32 rounded-full" : "aspect-video w-full "
              )}
            />
          ) : (
            <div
              className={cn(
                "object-cover border-4 border-gray-300 shadow items-center justify-center flex hover:bg-wkbackground flex-col",
                isProfile ? "w-32 h-32 rounded-full" : "aspect-video w-full "
              )}
            >
              {isProfile ? (
                <User className="text-muted" />
              ) : (
                <Volleyball className="text-muted" />
              )}
              <p className="text-sm text-muted">Click to upload</p>
            </div>
          )}

          {/* Upload label styled like a button over image */}

          <div className="absolute -bottom-5 right-0 bg-secondary p-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 "
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M4 3a2 2 0 00-2 2v2h2V5h2V3H4zm10 0v2h2v2h2V5a2 2 0 00-2-2h-2zM4 13H2v2a2 2 0 002 2h2v-2H4v-2zm14 0h-2v2h-2v2h2a2 2 0 002-2v-2zM8 11a2 2 0 114 0 2 2 0 01-4 0z" />
            </svg>
          </div>
          <input
            id={name}
            type="file"
            accept={accept}
            name={name}
            // defaultValue={image}
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>
      {errors && errors?.properties["avatar"] && (
        <p className="text-sm text-destructive mt-8">
          {errors?.properties[name].errors[0]}
        </p>
      )}
    </div>
  );
};
