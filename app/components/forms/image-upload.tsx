import { User } from "lucide-react";
import { useState } from "react";

type ImageUploadProps = {
  image: string;
  errors: any;
};
export const ImageUpload: React.FC<ImageUploadProps> = ({ image, errors }) => {
  const [previewUrl, setPreviewUrl] = useState(image);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="w-full">
      <div className="relative w-32 h-32 mb-4">
        <label
          htmlFor="file-upload"
          className="text-white p-2 rounded-full cursor-pointer shadow-lg transition "
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Profile preview"
              className="w-32 h-32 rounded-full object-cover border-4 border-gray-300 shadow"
            />
          ) : (
            <div className="w-32 h-32 rounded-full object-cover border-4 border-gray-300 shadow items-center justify-center flex hover:bg-wkbackground">
              <User className="text-muted" />
            </div>
          )}

          {/* Upload label styled like a button over image */}

          <div className="absolute bottom-0 right-0 bg-secondary p-1">
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
            id="file-upload"
            type="file"
            accept="image/*"
            name="avatar"
            // defaultValue={image}
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>
      {errors && errors?.properties["avatar"] && (
        <p className="text-sm text-destructive">
          {errors?.properties["avatar"].errors[0]}
        </p>
      )}
    </div>
  );
};
