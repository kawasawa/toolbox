// Generated by GitHub Copilot
'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { calculateFileSize } from '@/utils/fileUtils';
import { 
  isHeicImage, 
  compressImage, 
  extractExifData, 
  convertHeicToPng
} from '@/utils/imageUtils';

/**
 * 画像処理ロジックを提供するカスタムフック
 * @returns {Object} 画像処理に関する状態と関数
 */
export function useImageProcessor() {
  // 状態変数
  const [originalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dimensions, setDimensions] = useState({ width: '', height: '' });
  const [format, setFormat] = useState('png');
  const [compressionQuality, setCompressionQuality] = useState(90);
  const [exifData, setExifData] = useState(null);

  // 圧縮率の計算
  const compressionRatio = useMemo(() => 
    processedImage !== null && originalImage !== null ?
    ((1 - (processedImage.fileSize / originalImage.fileSize)) * 100).toFixed(1) : 0, 
    [processedImage, originalImage]
  );

  // JPEGまたはWebPが選択されているか確認
  const isCompressibleFormat = format === 'jpg' || format === 'webp';
  
  // フォーマット変更時の処理
  useEffect(() => {
    // フォーマットがJPGまたはWEBPでない場合は圧縮率を100%にリセット
    if (!isCompressibleFormat) {
      setCompressionQuality(100);
    }
  }, [format, isCompressibleFormat]);

  /**
   * 画像をファイルから読み込む
   * @param {File} file 画像ファイル
   */
  const loadImageFromFile = async (file) => {
    if (!file) return;
    
    try {
      setIsLoading(true);
      setProcessedImage(null);
      
      // HEIC形式の場合は変換処理を行う
      let processedFile = file;
      if (isHeicImage(file)) {
        try {
          processedFile = await convertHeicToPng(file);
        } catch (error) {
          setIsLoading(false);
          toast.error('HEIC形式の画像を変換できませんでした。');
          return;
        }
      }
      
      // 通常の画像処理フロー
      if (!processedFile.type.startsWith('image/')) {
        setIsLoading(false);
        toast.error('サポートされていない形式です。');
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new window.Image();
        
        img.onload = () => {
          setOriginalImage({
            element: img,
            url: e.target.result,
            width: img.width,
            height: img.height,
            type: processedFile.type,
            originalType: file !== processedFile ? 'image/heic' : processedFile.type
          });
          setDimensions({ width: '', height: '' });
          extractExifData(file).then(exifData => setExifData(exifData));
          setIsLoading(false);
          toast.success('画像を読み込みました');
        };
        
        img.onerror = () => {
          setIsLoading(false);
          toast.error('画像の読み込みに失敗しました');
        };
        
        img.src = e.target.result;
      };
      
      reader.onerror = () => {
        setIsLoading(false);
        toast.error('ファイル読み込みエラー');
      };
      
      reader.readAsDataURL(processedFile);
    } catch (error) {
      console.error('画像読み込みエラー:', error);
      setIsLoading(false);
      toast.error('画像の読み込み中にエラーが発生しました。');
    }
  };

  /**
   * 画像をURLから読み込む
   * @param {string} url 画像のURL
   */
  const loadImageFromUrl = async (url) => {
    if (!url) return;
    
    try {
      setIsLoading(true);
      setProcessedImage(null);
      
      const response = await fetch(url);
      const blob = await response.blob();
      
      const fileName = url.split('/').pop() || 'image';
      const file = new File([blob], fileName, { type: blob.type });
      
      // HEIC形式の場合は変換処理
      if (isHeicImage(file)) {
        try {
          const convertedFile = await convertHeicToPng(file);
          loadImageFromFile(convertedFile);
        } catch (error) {
          setIsLoading(false);
          toast.error('HEIC形式の画像を変換できませんでした。');
        }
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        
        img.onload = () => {
          setOriginalImage({
            element: img,
            url: e.target.result,
            width: img.width,
            height: img.height,
            type: blob.type
          });
          setDimensions({ width: '', height: '' });
          extractExifData(blob).then(exifData => setExifData(exifData));
          setIsLoading(false);
          toast.success('URLから画像を読み込みました');
        };
        
        img.onerror = () => {
          setIsLoading(false);
          toast.error('画像の読み込みに失敗しました');
        };
        
        img.src = e.target.result;
      };
      
      reader.onerror = () => {
        setIsLoading(false);
        toast.error('ファイル読み込みエラー');
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Failed to load image from URL:', error);
      setIsLoading(false);
      toast.error('画像の読み込みに失敗しました。URLが正しいか確認してください。');
    }
  };

  /**
   * クリップボードから画像を読み込む
   */
  const loadImageFromClipboard = async () => {
    try {
      setIsLoading(true);
      setProcessedImage(null);
      
      const items = await navigator.clipboard.read();
      
      for (const item of items) {
        if (item.types.includes('image/png') || 
            item.types.includes('image/jpeg') || 
            item.types.includes('image/webp') || 
            item.types.includes('image/gif')) {
          
          const imageType = item.types.find(type => type.startsWith('image/'));
          const blob = await item.getType(imageType);
          loadImageFromFile(new File([blob], 'clipboard-image.png', { type: imageType }));
          return;
        }
      }
      
      setIsLoading(false);
      toast.error('クリップボードに画像が見つかりませんでした。');
    } catch (error) {
      console.error('Failed to read from clipboard:', error);
      
      // Fallback for browsers that don't support Clipboard API fully
      try {
        const clipboardItems = await navigator.clipboard.readText();
        if (clipboardItems.startsWith('data:image') || clipboardItems.startsWith('http')) {
          loadImageFromUrl(clipboardItems);
        } else {
          setIsLoading(false);
          toast.error('クリップボードに画像が見つかりませんでした。');
        }
      } catch (error) {
        console.error('Failed to read text from clipboard:', error);
        setIsLoading(false);
        toast.error('クリップボードからの読み込みに失敗しました。');
      }
    }
  };

  /**
   * 画像を処理する（リサイズ・フォーマット変換・圧縮）
   */
  const processImage = () => {
    if (!originalImage) return;
    
    setIsProcessing(true);
    
    // キャンバスを作成してリサイズ
    const canvas = document.createElement('canvas');
    let newWidth = dimensions.width ? parseInt(dimensions.width) : originalImage.width;
    let newHeight = dimensions.height ? parseInt(dimensions.height) : originalImage.height;
    
    // 片方の寸法のみ指定された場合は、アスペクト比を維持
    if (dimensions.width && !dimensions.height) {
      const aspectRatio = originalImage.height / originalImage.width;
      newHeight = Math.round(newWidth * aspectRatio);
    } else if (!dimensions.width && dimensions.height) {
      const aspectRatio = originalImage.width / originalImage.height;
      newWidth = Math.round(newHeight * aspectRatio);
    }
    
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    const ctx = canvas.getContext('2d');
    // 高品質なリサイズを行う
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(originalImage.element, 0, 0, newWidth, newHeight);
    
    // 指定されたフォーマットで出力
    let mimeType;
    switch (format) {
      case 'jpg':
        mimeType = 'image/jpeg';
        break;
      case 'webp':
        mimeType = 'image/webp';
        break;
      case 'gif':
        mimeType = 'image/gif';
        break;
      case 'ico':
        mimeType = 'image/x-icon';
        break;
      case 'png':
      default:
        mimeType = 'image/png';
        break;
    }
    
    // 圧縮品質を設定（JPEGとWebPのみ対応）
    const isCompressible = (format === 'jpg' || format === 'webp') && compressionQuality < 100;
    const quality = isCompressible ? compressionQuality / 100 : undefined;
    
    // 圧縮処理を実行
    compressImage(canvas, mimeType, quality)
      .then(blob => {
        const url = URL.createObjectURL(blob);
        
        // 元の画像のサイズを算出（画素数とファイルサイズ）
        const originalPixels = originalImage.width * originalImage.height;
        
        // 処理後の画像のサイズを算出
        const processedPixels = newWidth * newHeight;
        const processedFileSize = calculateFileSize(blob);
        
        // 圧縮率を計算
        const pixelReductionRatio = ((1 - (processedPixels / originalPixels)) * 100).toFixed(1);
        
        setProcessedImage({
          url,
          width: newWidth,
          height: newHeight,
          type: mimeType,
          blob,
          fileSize: processedFileSize,
          pixelReduction: pixelReductionRatio,
          quality: isCompressible ? compressionQuality : 100
        });
        
        // 処理が完了したら、元の画像のblobも保存（ファイルサイズ比較用）
        if (!originalImage.blob && originalImage.url) {
          fetch(originalImage.url)
            .then(response => response.blob())
            .then(blob => {
              setOriginalImage({
                ...originalImage,
                blob,
                fileSize: calculateFileSize(blob)
              });
            })
            .catch(err => console.error('元画像のblobの取得に失敗しました', err));
        }
        
        setIsProcessing(false);
      });
  };

  return {
    // 状態
    originalImage,
    processedImage,
    isLoading,
    isProcessing,
    dimensions,
    format,
    compressionQuality,
    exifData,
    compressionRatio,
    isCompressibleFormat,
    
    // setter関数
    setDimensions,
    setFormat,
    setCompressionQuality,
    
    // 処理関数
    loadImageFromFile,
    loadImageFromUrl,
    loadImageFromClipboard,
    processImage
  };
}