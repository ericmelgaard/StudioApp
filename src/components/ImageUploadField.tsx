import { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ImageUploadFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export default function ImageUploadField({
  value,
  onChange,
  label
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload file to Supabase Storage (bucket is created via migration)
      const { data, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      onChange(publicUrl);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleRemove() {
    if (!value) return;

    // Only attempt to delete from storage if it's a storage URL
    if (value.includes('supabase') && value.includes('product-images')) {
      try {
        // Extract the file path from the URL
        const url = new URL(value);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];

        // Delete from storage (just the filename, not prefixed with bucket name)
        await supabase.storage
          .from('product-images')
          .remove([fileName]);
      } catch (err) {
        console.error('Error deleting image from storage:', err);
        // Continue anyway - the reference will be removed from the database
      }
    }

    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      {!value ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id={`image-upload-${label}`}
          />
          <label
            htmlFor={`image-upload-${label}`}
            className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg transition-colors ${
              uploading
                ? 'border-blue-300 bg-blue-50 cursor-wait'
                : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 text-blue-500 mb-2 animate-spin" />
                <span className="text-sm text-blue-600 font-medium">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm text-slate-600 font-medium">Upload {label}</span>
                <span className="text-xs text-slate-400 mt-1">JPEG, PNG, WebP, or GIF (max 5MB)</span>
              </>
            )}
          </label>
        </div>
      ) : (
        <div className="relative inline-block">
          <img
            src={value}
            alt={label}
            className="max-w-md max-h-80 object-contain rounded-lg border border-slate-300 bg-slate-50"
            onError={(e) => {
              // Handle broken image URLs
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f1f5f9" width="200" height="200"/%3E%3Ctext fill="%2394a3b8" font-size="14" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EImage not found%3C/text%3E%3C/svg%3E';
            }}
          />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
            title="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
