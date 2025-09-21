/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, generateBackgroundImage, applyBackgroundToImage, generateRandomPrompt } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import { UndoIcon, RedoIcon, EyeIcon, MagicWandIcon, LoadingSpinnerIcon } from './components/icons';
import StartScreen from './components/StartScreen';
import ThumbnailStrip from './components/ThumbnailStrip';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

interface ImageState {
  original: File;
  history: File[];
  historyIndex: number;
}
type Tab = 'retouch' | 'adjust' | 'filters' | 'crop';
type AspectRatioString = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';


const App: React.FC = () => {
  const [images, setImages] = useState<ImageState[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editHotspots, setEditHotspots] = useState<{ x: number, y: number }[]>([]);
  const [displayHotspots, setDisplayHotspots] = useState<{ x: number, y: number }[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('retouch');
  
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const [generatedBackground, setGeneratedBackground] = useState<File | null>(null);
  const [generatedBackgroundUrl, setGeneratedBackgroundUrl] = useState<string | null>(null);

  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);

  const isLoading = loadingMessage !== null;
  const activeImageState = images[activeImageIndex] ?? null;
  const currentImage = activeImageState?.history[activeImageState.historyIndex] ?? null;
  const originalImage = activeImageState?.original ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);


  const canUndo = activeImageState ? activeImageState.historyIndex > 0 : false;
  const canRedo = activeImageState ? activeImageState.historyIndex < activeImageState.history.length - 1 : false;

  const updateImageState = (index: number, updates: Partial<ImageState>) => {
    setImages(prevImages => prevImages.map((img, i) => i === index ? { ...img, ...updates } : img));
  };

  const addImageToHistory = useCallback((newImageFile: File, index: number) => {
    setImages(prevImages => {
      const targetImage = prevImages[index];
      if (!targetImage) return prevImages;

      const newHistory = targetImage.history.slice(0, targetImage.historyIndex + 1);
      newHistory.push(newImageFile);
      
      const newImages = [...prevImages];
      newImages[index] = {
        ...targetImage,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
      return newImages;
    });

    if (index === activeImageIndex) {
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
  }, [activeImageIndex]);
  
  const handleImageUpload = useCallback((files: File[]) => {
    setError(null);
    const newImages = files.map(file => ({
      original: file,
      history: [file],
      historyIndex: 0,
    }));
    setImages(newImages);
    setActiveImageIndex(0);
    setEditHotspots([]);
    setDisplayHotspots([]);
    setActiveTab('retouch');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setGeneratedBackground(null);
    setGeneratedBackgroundUrl(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!currentImage) {
      setError('Tidak ada gambar yang dimuat untuk diedit.');
      return;
    }
    
    if (!prompt.trim()) {
        setError('Silakan masukkan deskripsi untuk editan Anda.');
        return;
    }

    if (editHotspots.length === 0) {
        setError('Silakan klik pada gambar untuk memilih area yang akan diedit.');
        return;
    }

    setLoadingMessage('AI sedang bekerja...');
    setError(null);
    
    try {
        const editedImageUrl = await generateEditedImage(currentImage, prompt, editHotspots);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile, activeImageIndex);
        setEditHotspots([]);
        setDisplayHotspots([]);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal.';
        setError(`Gagal menghasilkan gambar. ${errorMessage}`);
        console.error(err);
    } finally {
        setLoadingMessage(null);
    }
  }, [currentImage, prompt, editHotspots, addImageToHistory, activeImageIndex]);
  
  const handleApplyBatchOperation = useCallback(async (
    prompt: string, 
    operation: (image: File, prompt: string) => Promise<string>,
    operationName: string,
    applyToAll: boolean
  ) => {
    const targets = applyToAll ? images.map((_, i) => i) : [activeImageIndex];
    if (targets.some(i => i < 0 || !images[i])) {
      setError(`Tidak ada gambar yang dipilih untuk menerapkan ${operationName}.`);
      return;
    }
    
    setError(null);
    
    try {
      for (let i = 0; i < targets.length; i++) {
        const imageIndex = targets[i];
        const imageState = images[imageIndex];
        const imageToProcess = imageState.history[imageState.historyIndex];
        if (!imageToProcess) continue;

        setLoadingMessage(
          applyToAll 
            ? `Menerapkan ${operationName} ke gambar ${i + 1} dari ${targets.length}...` 
            : `AI sedang menerapkan ${operationName}...`
        );
        
        const resultUrl = await operation(imageToProcess, prompt);
        const newImageFile = dataURLtoFile(resultUrl, `${operationName}-${Date.now()}.png`);
        addImageToHistory(newImageFile, imageIndex);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal.';
      setError(`Gagal menerapkan ${operationName}. ${errorMessage}`);
      console.error(err);
    } finally {
      setLoadingMessage(null);
    }
  }, [images, activeImageIndex, addImageToHistory]);

  const handleApplyFilter = (filterPrompt: string, applyToAll: boolean) => 
    handleApplyBatchOperation(filterPrompt, generateFilteredImage, 'filter', applyToAll);

  const handleApplyAdjustment = (adjustmentPrompt: string, applyToAll: boolean) => 
    handleApplyBatchOperation(adjustmentPrompt, generateAdjustedImage, 'penyesuaian', applyToAll);

  const handleGenerateBackground = useCallback(async (bgPrompt: string) => {
    if (!imgRef.current) {
        setError('Tidak dapat membuat latar belakang tanpa referensi gambar.');
        return;
    }
    setLoadingMessage('Membuat latar belakang...');
    setError(null);

    try {
        const supportedAspects = [
            { name: '1:1', value: 1 }, { name: '3:4', value: 0.75 }, { name: '4:3', value: 4/3 },
            { name: '9:16', value: 9/16 }, { name: '16:9', value: 16/9 },
        ];
        const imageAspect = imgRef.current.naturalWidth / imgRef.current.naturalHeight;
        const closest = supportedAspects.reduce((prev, curr) => 
            Math.abs(curr.value - imageAspect) < Math.abs(prev.value - imageAspect) ? curr : prev
        );
        
        const backgroundUrl = await generateBackgroundImage(bgPrompt, closest.name as AspectRatioString);
        const backgroundFile = dataURLtoFile(backgroundUrl, `background-${Date.now()}.png`);
        
        setGeneratedBackground(backgroundFile);
        if (generatedBackgroundUrl) {
          URL.revokeObjectURL(generatedBackgroundUrl);
        }
        setGeneratedBackgroundUrl(URL.createObjectURL(backgroundFile));

    } catch(err) {
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal.';
        setError(`Gagal membuat latar belakang. ${errorMessage}`);
        console.error(err);
    } finally {
        setLoadingMessage(null);
    }
  }, [generatedBackgroundUrl]);

  const handleBackgroundUpload = useCallback((file: File) => {
    setError(null);
    setGeneratedBackground(file);
    if (generatedBackgroundUrl) {
      URL.revokeObjectURL(generatedBackgroundUrl);
    }
    setGeneratedBackgroundUrl(URL.createObjectURL(file));
  }, [generatedBackgroundUrl]);

  const handleApplyBackground = useCallback(async (applyToAll: boolean) => {
    if (!generatedBackground) {
        setError('Tidak ada latar belakang yang dibuat untuk diterapkan.');
        return;
    }
    const targets = applyToAll ? images.map((_, i) => i) : [activeImageIndex];
    if (targets.some(i => i < 0 || !images[i])) {
      setError(`Tidak ada gambar yang dipilih untuk menerapkan latar belakang.`);
      return;
    }
    
    setError(null);

    try {
        for (let i = 0; i < targets.length; i++) {
            const imageIndex = targets[i];
            const imageState = images[imageIndex];
            const imageToProcess = imageState.history[imageState.historyIndex];
            if (!imageToProcess) continue;

            setLoadingMessage(
              applyToAll 
                ? `Menerapkan latar belakang ke gambar ${i + 1} dari ${targets.length}...` 
                : `AI sedang menerapkan latar belakang...`
            );
            
            const resultUrl = await applyBackgroundToImage(imageToProcess, generatedBackground);
            const newImageFile = dataURLtoFile(resultUrl, `bg-applied-${Date.now()}.png`);
            addImageToHistory(newImageFile, imageIndex);
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal.';
        setError(`Gagal menerapkan latar belakang. ${errorMessage}`);
        console.error(err);
    } finally {
        setLoadingMessage(null);
    }
  }, [generatedBackground, images, activeImageIndex, addImageToHistory]);

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) {
        setError('Silakan pilih area untuk dipotong.');
        return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        setError('Tidak dapat memproses pemotongan.');
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile, activeImageIndex);

  }, [completedCrop, addImageToHistory, activeImageIndex]);

  const handleUndo = useCallback(() => {
    if (canUndo && activeImageState) {
      updateImageState(activeImageIndex, { historyIndex: activeImageState.historyIndex - 1 });
      setEditHotspots([]);
      setDisplayHotspots([]);
    }
  }, [canUndo, activeImageState, activeImageIndex]);
  
  const handleRedo = useCallback(() => {
    if (canRedo && activeImageState) {
      updateImageState(activeImageIndex, { historyIndex: activeImageState.historyIndex + 1 });
      setEditHotspots([]);
      setDisplayHotspots([]);
    }
  }, [canRedo, activeImageState, activeImageIndex]);

  const handleReset = useCallback(() => {
    if (activeImageState) {
      updateImageState(activeImageIndex, { historyIndex: 0 });
      setError(null);
      setEditHotspots([]);
      setDisplayHotspots([]);
      setGeneratedBackground(null);
      setGeneratedBackgroundUrl(null);
    }
  }, [activeImageState, activeImageIndex]);

  const handleUploadNew = useCallback(() => {
      setImages([]);
      setActiveImageIndex(-1);
      setError(null);
      setPrompt('');
      setEditHotspots([]);
      setDisplayHotspots([]);
      setGeneratedBackground(null);
      setGeneratedBackgroundUrl(null);
  }, []);

  const handleDownload = useCallback(() => {
      if (currentImage) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `edited-${currentImage.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage]);
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      handleImageUpload(Array.from(files));
    }
  };

  const handleSelectImage = useCallback((index: number) => {
    setActiveImageIndex(index);
    setEditHotspots([]);
    setDisplayHotspots([]);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, []);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTab !== 'retouch') return;
    
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDisplayHotspots(prev => [...prev, { x: offsetX, y: offsetY }]);

    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;

    const originalX = Math.round(offsetX * scaleX);
    const originalY = Math.round(offsetY * scaleY);

    setEditHotspots(prev => [...prev, { x: originalX, y: originalY }]);
  };

  const handleGenerateRandomRetouchPrompt = async () => {
      if (isGeneratingIdea) return;
      setIsGeneratingIdea(true);
      setError(null);
      try {
          const idea = await generateRandomPrompt('retouch');
          setPrompt(idea);
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal.';
          setError(errorMessage);
      } finally {
          setIsGeneratingIdea(false);
      }
  };

  const renderContent = () => {
    if (error) {
       return (
           <div className="text-center animate-fade-in bg-[#963A2F]/20 border border-[#963A2F]/40 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-[#ECB984]">Terjadi Kesalahan</h2>
            <p className="text-md text-[#D58258]">{error}</p>
            <button
                onClick={() => setError(null)}
                className="bg-[#963A2F] hover:bg-[#a14337] text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
              >
                Coba Lagi
            </button>
          </div>
        );
    }
    
    if (!currentImageUrl || !activeImageState) {
      return <StartScreen onFileSelect={handleFileSelect} />;
    }

    const imageDisplay = (
      <div className="relative">
        {/* Base image is the original, always at the bottom */}
        {originalImageUrl && (
            <img
                key={originalImageUrl}
                src={originalImageUrl}
                alt="Original"
                className="w-full h-auto object-contain max-h-[60vh] rounded-xl pointer-events-none"
            />
        )}
        {/* The current image is an overlay that fades in/out for comparison */}
        <img
            ref={imgRef}
            key={currentImageUrl}
            src={currentImageUrl}
            alt="Current"
            onClick={handleImageClick}
            className={`absolute top-0 left-0 w-full h-auto object-contain max-h-[60vh] rounded-xl transition-opacity duration-200 ease-in-out ${isComparing ? 'opacity-0' : 'opacity-100'} ${activeTab === 'retouch' ? 'cursor-crosshair' : ''}`}
        />
      </div>
    );
    
    // For ReactCrop, we need a single image element. We'll use the current one.
    const cropImageElement = (
      <img 
        ref={imgRef}
        key={`crop-${currentImageUrl}`}
        src={currentImageUrl} 
        alt="Crop this image"
        className="w-full h-auto object-contain max-h-[60vh] rounded-xl"
      />
    );

    const tabNames: { [key in Tab]: string } = {
        retouch: 'Sentuh Ulang',
        adjust: 'Sesuaikan',
        filters: 'Filter',
        crop: 'Potong',
    };

    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-[#2b1a17]/50">
            {isLoading && (
                <div className="absolute inset-0 bg-[#2b1a17]/80 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                    <Spinner />
                    <p className="text-[#ECB984]">{loadingMessage}</p>
                </div>
            )}
            
            {activeTab === 'crop' ? (
              <ReactCrop 
                crop={crop} 
                onChange={c => setCrop(c)} 
                onComplete={c => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[60vh]"
              >
                {cropImageElement}
              </ReactCrop>
            ) : imageDisplay }

            {displayHotspots.length > 0 && !isLoading && activeTab === 'retouch' && (
                displayHotspots.map((hotspot, index) => (
                    <div 
                        key={index}
                        className="absolute rounded-full w-6 h-6 bg-[#D58258]/60 border-2 border-[#FFFEE9] pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                        style={{ left: `${hotspot.x}px`, top: `${hotspot.y}px` }}
                    >
                        <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-[#D58258]"></div>
                    </div>
                ))
            )}
        </div>
        
        <ThumbnailStrip images={images} activeImageIndex={activeImageIndex} onSelectImage={handleSelectImage} />

        <div className="w-full bg-[#4a2c27]/80 border border-[#ECB984]/20 rounded-lg p-2 flex items-center justify-center gap-2 backdrop-blur-sm">
            {(['retouch', 'crop', 'adjust', 'filters'] as Tab[]).map(tab => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`w-full capitalize font-semibold py-3 px-5 rounded-md transition-all duration-200 text-base ${
                        activeTab === tab 
                        ? 'bg-gradient-to-br from-[#D58258] to-[#ECB984] text-[#4a2c27] shadow-lg shadow-[#ECB984]/20' 
                        : 'text-[#ECB984] hover:text-[#FFFEE9] hover:bg-[#FFFEE9]/10'
                    }`}
                >
                    {tabNames[tab]}
                </button>
            ))}
        </div>
        
        <div className="w-full">
            {activeTab === 'retouch' && (
                <div className="flex flex-col items-center gap-2">
                    <div className="flex justify-between items-center w-full">
                        <p className="text-md text-[#ECB984]">
                          {editHotspots.length > 0 ? `Bagus! ${editHotspots.length} titik dipilih. Deskripsikan editan Anda.` : 'Klik area pada gambar untuk melakukan editan yang presisi.'}
                        </p>
                        {editHotspots.length > 0 && (
                            <button 
                                onClick={() => { setEditHotspots([]); setDisplayHotspots([]); }}
                                className="text-sm text-[#ECB984]/80 hover:text-[#ECB984] underline transition-colors"
                            >
                                Hapus Titik
                            </button>
                        )}
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2 mt-2">
                        <div className="relative flex-grow">
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={editHotspots.length > 0 ? "contoh: 'ubah warna bajuku menjadi biru'" : "Klik dulu sebuah titik pada gambar"}
                                className="flex-grow bg-[#4a2c27] border border-[#ECB984]/20 text-[#FFFEE9] rounded-lg p-5 text-lg focus:ring-2 focus:ring-[#D58258] focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 pr-12"
                                disabled={isLoading || editHotspots.length === 0}
                            />
                             <button
                                type="button"
                                onClick={handleGenerateRandomRetouchPrompt}
                                disabled={isLoading || editHotspots.length === 0 || isGeneratingIdea}
                                className="absolute top-1/2 right-4 -translate-y-1/2 text-[#ECB984]/60 hover:text-[#ECB984] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Dapatkan ide acak"
                                title="Dapatkan ide acak dari AI"
                            >
                                {isGeneratingIdea ? <LoadingSpinnerIcon className="w-5 h-5"/> : <MagicWandIcon className="w-5 h-5" />}
                            </button>
                        </div>
                        <button 
                            type="submit"
                            className="bg-gradient-to-br from-[#D58258] to-[#c7724a] text-white font-bold py-5 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-[#D58258]/30 hover:shadow-xl hover:shadow-[#D58258]/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-[#9d6246] disabled:to-[#8a553c] disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                            disabled={isLoading || !prompt.trim() || editHotspots.length === 0}
                        >
                            Buat
                        </button>
                    </form>
                </div>
            )}
            {activeTab === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
            {activeTab === 'adjust' && <AdjustmentPanel onApply={handleApplyAdjustment} isLoading={isLoading} isBatchMode={images.length > 1} onGenerateBackground={handleGenerateBackground} onApplyBackground={handleApplyBackground} generatedBackgroundUrl={generatedBackgroundUrl} onUploadBackground={handleBackgroundUpload} setError={setError} />}
            {activeTab === 'filters' && <FilterPanel onApply={handleApplyFilter} isLoading={isLoading} isBatchMode={images.length > 1} setError={setError} />}
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button 
                onClick={handleUndo}
                disabled={!canUndo}
                className="flex items-center justify-center text-center bg-[#FFFEE9]/10 border border-[#FFFEE9]/20 text-[#FFFEE9] font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-[#FFFEE9]/20 hover:border-[#FFFEE9]/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#FFFEE9]/5"
                aria-label="Urungkan tindakan terakhir"
            >
                <UndoIcon className="w-5 h-5 mr-2" />
                Urungkan
            </button>
            <button 
                onClick={handleRedo}
                disabled={!canRedo}
                className="flex items-center justify-center text-center bg-[#FFFEE9]/10 border border-[#FFFEE9]/20 text-[#FFFEE9] font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-[#FFFEE9]/20 hover:border-[#FFFEE9]/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#FFFEE9]/5"
                aria-label="Ulangi tindakan terakhir"
            >
                <RedoIcon className="w-5 h-5 mr-2" />
                Ulangi
            </button>
            
            <div className="h-6 w-px bg-[#ECB984]/30 mx-1 hidden sm:block"></div>

            {canUndo && (
              <button 
                  onMouseDown={() => setIsComparing(true)}
                  onMouseUp={() => setIsComparing(false)}
                  onMouseLeave={() => setIsComparing(false)}
                  onTouchStart={() => setIsComparing(true)}
                  onTouchEnd={() => setIsComparing(false)}
                  className="flex items-center justify-center text-center bg-[#FFFEE9]/10 border border-[#FFFEE9]/20 text-[#FFFEE9] font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-[#FFFEE9]/20 hover:border-[#FFFEE9]/30 active:scale-95 text-base"
                  aria-label="Tekan dan tahan untuk melihat gambar asli"
              >
                  <EyeIcon className="w-5 h-5 mr-2" />
                  Bandingkan
              </button>
            )}

            <button 
                onClick={handleReset}
                disabled={!canUndo}
                className="text-center bg-transparent border border-[#FFFEE9]/20 text-[#FFFEE9] font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-[#FFFEE9]/10 hover:border-[#FFFEE9]/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent"
              >
                Reset
            </button>
            <button 
                onClick={handleUploadNew}
                className="text-center bg-[#FFFEE9]/10 border border-[#FFFEE9]/20 text-[#FFFEE9] font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-[#FFFEE9]/20 hover:border-[#FFFEE9]/30 active:scale-95 text-base"
            >
                Unggah Baru
            </button>

            <button 
                onClick={handleDownload}
                className="flex-grow sm:flex-grow-0 ml-auto bg-gradient-to-br from-[#A8A676] to-[#999768] text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-[#A8A676]/30 hover:shadow-xl hover:shadow-[#A8A676]/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base"
            >
                Unduh Gambar
            </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen text-[#FFFEE9] flex flex-col">
      <Header />
      <main className={`flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center ${currentImage ? 'items-start' : 'items-center'}`}>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;