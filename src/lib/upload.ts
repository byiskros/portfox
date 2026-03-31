import { supabase } from '@/integrations/supabase/client';

export async function uploadImage(file: File, userId: string, folder: string = 'images'): Promise<string> {
  // Compress image
  const compressed = await compressImage(file);
  
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${userId}/${folder}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('portfolio-images')
    .upload(fileName, compressed, { contentType: compressed.type });

  if (error) throw error;

  const { data } = supabase.storage
    .from('portfolio-images')
    .getPublicUrl(fileName);

  return data.publicUrl;
}

function compressImage(file: File, maxWidth = 1600): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to compress image'));
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
