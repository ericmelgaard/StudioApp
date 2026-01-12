const MAX_THUMBNAIL_SIZE = 400;

export interface ThumbnailResult {
  blob: Blob;
  width: number;
  height: number;
}

export const thumbnailGenerator = {
  async generateImageThumbnail(file: File): Promise<ThumbnailResult> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_THUMBNAIL_SIZE) {
            height = (height * MAX_THUMBNAIL_SIZE) / width;
            width = MAX_THUMBNAIL_SIZE;
          }
        } else {
          if (height > MAX_THUMBNAIL_SIZE) {
            width = (width * MAX_THUMBNAIL_SIZE) / height;
            height = MAX_THUMBNAIL_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, width, height });
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          },
          'image/jpeg',
          0.85
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  },

  async generateVideoThumbnail(file: File): Promise<ThumbnailResult> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration / 10);
      };

      video.onseeked = () => {
        URL.revokeObjectURL(url);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > height) {
          if (width > MAX_THUMBNAIL_SIZE) {
            height = (height * MAX_THUMBNAIL_SIZE) / width;
            width = MAX_THUMBNAIL_SIZE;
          }
        } else {
          if (height > MAX_THUMBNAIL_SIZE) {
            width = (width * MAX_THUMBNAIL_SIZE) / height;
            height = MAX_THUMBNAIL_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(video, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, width, height });
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          },
          'image/jpeg',
          0.85
        );
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video'));
      };

      video.src = url;
    });
  },

  async generateThumbnail(file: File): Promise<ThumbnailResult | null> {
    try {
      if (file.type.startsWith('image/')) {
        return await this.generateImageThumbnail(file);
      } else if (file.type.startsWith('video/')) {
        return await this.generateVideoThumbnail(file);
      }
      return null;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return null;
    }
  }
};
