import React from "react";
import { Plus, X, Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/app/providers/AuthProvider";

interface CoverUploadProps {
  coverImage: string | null;
  onCoverImageChange: (file: File | null) => void;
}

const CoverUpload = ({ coverImage, onCoverImageChange }: CoverUploadProps) => {
  const { user } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onCoverImageChange(files[0]);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCoverImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="cover-upload bg-popover h-64 relative animate-fade-in overflow-hidden group">
      {/* User Info - Top Left */}
      <div className="absolute top-4 left-4 flex items-center gap-3 z-10">
        <Avatar className="w-10 h-10 border-2 border-popover">
          <AvatarImage src={user?.profile?.avatar_url} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {user?.profile?.first_name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        <span className="text-foreground font-medium">
          {user?.profile?.first_name || 'Пользователь'}
        </span>
      </div>

      {/* Cover Image */}
      {coverImage && (
        <img
          src={coverImage}
          alt="Course cover"
          className="w-full h-full object-cover"
        />
      )}

      {/* Action Buttons - Top Right (shown when image is uploaded) */}
      {coverImage && (
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <button
            onClick={handleClick}
            className="p-2 bg-background/90 backdrop-blur-sm rounded-full hover:bg-background transition-colors shadow-lg"
            title="Изменить обложку"
          >
            <Pencil className="w-4 h-4 text-foreground" />
          </button>
          <button
            onClick={handleRemove}
            className="p-2 bg-background/90 backdrop-blur-sm rounded-full hover:bg-destructive/20 transition-colors shadow-lg"
            title="Удалить обложку"
          >
            <X className="w-4 h-4 text-destructive" />
          </button>
        </div>
      )}

      {/* Upload Center */}
      <div
        onClick={handleClick}
        className={`flex flex-col items-center justify-center h-full cursor-pointer transition-opacity ${
          coverImage ? 'opacity-0 group-hover:opacity-100 bg-black/20' : ''
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        {!coverImage && (
          <>
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-cover-border flex items-center justify-center mb-3 hover:border-primary transition-colors group-hover:scale-110">
              <Plus className="w-8 h-8 text-primary transition-transform" strokeWidth={1.5} />
            </div>
            <span className="text-primary font-medium">Добавить обложку</span>
          </>
        )}
        {coverImage && (
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-background/90 backdrop-blur-sm rounded-full mb-2">
              <Pencil className="w-6 h-6 text-primary" />
            </div>
            <span className="text-background font-medium drop-shadow-lg">Изменить обложку</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoverUpload;
