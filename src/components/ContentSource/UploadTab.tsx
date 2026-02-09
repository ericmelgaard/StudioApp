import { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Video, File, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UploadedFile {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  assetId?: string;
  error?: string;
}

interface UploadTabProps {
  selectedAssetId: string | null;
  onSelectAsset: (id: string) => void;
  companyId?: number | null;
  conceptId?: number | null;
  storeId?: number | null;
}

export function UploadTab({
  selectedAssetId,
  onSelectAsset,
  companyId,
  conceptId,
  storeId
}: UploadTabProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      return isImage || isVideo;
    });

    const newUploadedFiles: UploadedFile[] = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);

    newUploadedFiles.forEach((uploadedFile, index) => {
      uploadFile(uploadedFiles.length + index, uploadedFile);
    });
  };

  const uploadFile = async (index: number, uploadedFile: UploadedFile) => {
    const { file } = uploadedFile;

    try {
      setUploadedFiles(prev => {
        const newFiles = [...prev];
        newFiles[index].status = 'uploading';
        return newFiles;
      });

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const assetType = file.type.startsWith('image/') ? 'image' : 'video';
      const title = file.name.replace(/\.[^/.]+$/, '');

      const { data: assetData, error: assetError } = await supabase
        .from('asset_library')
        .insert({
          filename: file.name,
          storage_path: filePath,
          preview_path: filePath,
          file_type: file.type,
          file_size: file.size,
          asset_type: assetType,
          title,
          company_id: companyId,
          concept_id: conceptId,
          store_id: storeId,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (assetError) throw assetError;

      setUploadedFiles(prev => {
        const newFiles = [...prev];
        newFiles[index].status = 'success';
        newFiles[index].progress = 100;
        newFiles[index].assetId = assetData.id;
        return newFiles;
      });

      onSelectAsset(assetData.id);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadedFiles(prev => {
        const newFiles = [...prev];
        newFiles[index].status = 'error';
        newFiles[index].error = error instanceof Error ? error.message : 'Upload failed';
        return newFiles;
      });
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
    if (file.type.startsWith('video/')) return <Video className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  return (
    <div className="flex flex-col h-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 bg-slate-50 hover:border-slate-400'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              Drop files here or click to upload
            </h3>
            <p className="text-sm text-slate-500">
              Supports images and videos up to 50MB
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Choose Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-6 flex-1 overflow-y-auto">
          <h4 className="text-sm font-semibold text-slate-900 mb-3">
            Uploaded Files ({uploadedFiles.length})
          </h4>
          <div className="space-y-2">
            {uploadedFiles.map((uploadedFile, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  uploadedFile.assetId === selectedAssetId
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                } ${uploadedFile.assetId ? 'cursor-pointer' : ''}`}
                onClick={() => uploadedFile.assetId && onSelectAsset(uploadedFile.assetId)}
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                  {uploadedFile.file.type.startsWith('image/') ? (
                    <img
                      src={uploadedFile.preview}
                      alt={uploadedFile.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-400">
                      {getFileIcon(uploadedFile.file)}
                    </span>
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {uploadedFile.file.name}
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 mb-2">
                    {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>

                  {uploadedFile.status === 'uploading' && (
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadedFile.progress}%` }}
                      />
                    </div>
                  )}

                  {uploadedFile.status === 'error' && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {uploadedFile.error}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {uploadedFile.status === 'uploading' && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                  )}
                  {uploadedFile.status === 'success' && (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                  {uploadedFile.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
