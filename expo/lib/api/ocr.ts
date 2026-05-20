import { supabase } from '@/lib/supabase';

export interface OCRResult {
  readable: boolean;
  value: number | null;
  confidence: 'high' | 'medium' | 'low';
  error?: string;
}

export const readMeterFromImage = async (imageBase64: string, mimeType: string = 'image/jpeg'): Promise<OCRResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('ocr-meter', {
      body: { imageBase64, mimeType },
    });

    if (error) throw error;
    return data as OCRResult;
  } catch (err: any) {
    console.error('OCR error:', err);
    return {
      readable: false,
      value: null,
      confidence: 'low',
      error: err.message,
    };
  }
};

export const uploadMeterImage = async (imageBase64: string, meterId: string): Promise<string | null> => {
  try {
    const fileName = `meters//.jpg`;
    const byteCharacters = atob(imageBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    const { data, error } = await supabase.storage
      .from('meter-images')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('meter-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (err) {
    console.error('Upload error:', err);
    return null;
  }
};
