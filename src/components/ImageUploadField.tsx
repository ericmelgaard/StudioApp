import { useState, useRef, useEffect } from 'react';
import { Upload, X, Crop, Check } from 'lucide-react';

interface ImageUploadFieldProps {
  value: string;
  onChange: (value: string) => void;
  targetWidth: number;
  targetHeight: number;
  label: string;
}

export default function ImageUploadField({
  value,
  onChange,
  targetWidth,
  targetHeight,
  label
}: ImageUploadFieldProps) {
  const [showCropper, setShowCropper] = useState(false);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectRatio = targetWidth / targetHeight;

  useEffect(() => {
    if (originalImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = originalImage.width;
      canvas.height = originalImage.height;

      ctx.drawImage(originalImage, 0, 0);

      if (cropArea.width > 0 && cropArea.height > 0) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, cropArea.y);
        ctx.fillRect(0, cropArea.y, cropArea.x, cropArea.height);
        ctx.fillRect(cropArea.x + cropArea.width, cropArea.y, canvas.width - cropArea.x - cropArea.width, cropArea.height);
        ctx.fillRect(0, cropArea.y + cropArea.height, canvas.width, canvas.height - cropArea.y - cropArea.height);
      }
    }
  }, [originalImage, cropArea]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);

        const imgAspect = img.width / img.height;
        let cropW, cropH;

        if (imgAspect > aspectRatio) {
          cropH = img.height;
          cropW = cropH * aspectRatio;
        } else {
          cropW = img.width;
          cropH = cropW / aspectRatio;
        }

        setCropArea({
          x: (img.width - cropW) / 2,
          y: (img.height - cropH) / 2,
          width: cropW,
          height: cropH
        });

        setShowCropper(true);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleCanvasMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = originalImage!.width / rect.width;
    const scaleY = originalImage!.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    if (
      mouseX >= cropArea.x &&
      mouseX <= cropArea.x + cropArea.width &&
      mouseY >= cropArea.y &&
      mouseY <= cropArea.y + cropArea.height
    ) {
      setIsDragging(true);
    }
  }

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDragging || !canvasRef.current || !originalImage) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = originalImage.width / rect.width;
    const scaleY = originalImage.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const newX = Math.max(0, Math.min(mouseX - cropArea.width / 2, originalImage.width - cropArea.width));
    const newY = Math.max(0, Math.min(mouseY - cropArea.height / 2, originalImage.height - cropArea.height));

    setCropArea(prev => ({ ...prev, x: newX, y: newY }));
  }

  function handleCanvasMouseUp() {
    setIsDragging(false);
  }

  function handleCropConfirm() {
    if (!originalImage) return;

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = targetWidth;
    outputCanvas.height = targetHeight;
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      originalImage,
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height,
      0,
      0,
      targetWidth,
      targetHeight
    );

    const croppedDataUrl = outputCanvas.toDataURL('image/jpeg', 0.9);
    onChange(croppedDataUrl);
    setShowCropper(false);
    setOriginalImage(null);
  }

  function handleRemove() {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div>
      {!value ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id={`image-upload-${label}`}
          />
          <label
            htmlFor={`image-upload-${label}`}
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <Upload className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-sm text-slate-600">Upload {label}</span>
            <span className="text-xs text-slate-400 mt-1">{targetWidth} × {targetHeight}</span>
          </label>
        </div>
      ) : (
        <div className="relative inline-block">
          <img
            src={value}
            alt={label}
            style={{ width: `${targetWidth}px`, height: `${targetHeight}px` }}
            className="object-contain rounded-lg border border-slate-300"
          />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showCropper && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Crop & Resize Image</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Drag to reposition • Target: {targetWidth} × {targetHeight}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCropper(false);
                  setOriginalImage(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-100">
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className="max-w-full max-h-full cursor-move shadow-lg"
                style={{ imageRendering: 'auto' }}
              />
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Crop Area: {Math.round(cropArea.width)} × {Math.round(cropArea.height)}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCropper(false);
                    setOriginalImage(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Apply Crop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
