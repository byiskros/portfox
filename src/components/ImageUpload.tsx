import { useRef, ChangeEvent } from 'react';
import { Upload } from 'lucide-react';

interface ImageUploadProps {
  onUpload: (file: File) => void;
  loading?: boolean;
  preview?: string | null;
  className?: string;
  label?: string;
}

export default function ImageUpload({ onUpload, loading, preview, className = '', label = 'Загрузить изображение' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div
      className={`relative cursor-pointer rounded-lg border border-dashed border-border hover:border-foreground/30 transition-colors ${className}`}
      onClick={() => inputRef.current?.click()}
    >
      {preview ? (
        <img src={preview} alt="" className="w-full h-full object-cover rounded-lg" />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
          <Upload className="h-5 w-5" />
          <span className="text-xs">{loading ? 'Загрузка…' : label}</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
