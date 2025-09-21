/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { UploadIcon, MagicWandIcon, LoadingSpinnerIcon } from './icons';
import { generateRandomPrompt } from '../services/geminiService';

interface AdjustmentPanelProps {
  onApply: (prompt: string, applyToAll: boolean) => void;
  isLoading: boolean;
  isBatchMode: boolean;
  onGenerateBackground: (prompt: string) => void;
  onUploadBackground: (file: File) => void;
  onApplyBackground: (applyToAll: boolean) => void;
  generatedBackgroundUrl: string | null;
  setError: (error: string | null) => void;
}

const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({ 
  onApply, 
  isLoading, 
  isBatchMode,
  onGenerateBackground,
  onUploadBackground,
  onApplyBackground,
  generatedBackgroundUrl,
  setError
}) => {
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [backgroundPrompt, setBackgroundPrompt] = useState('');
  const [isGeneratingAdjustIdea, setIsGeneratingAdjustIdea] = useState(false);
  const [isGeneratingBgIdea, setIsGeneratingBgIdea] = useState(false);


  const presets = [
    { name: 'Buramkan Latar', prompt: 'Apply a realistic depth-of-field effect, making the background blurry while keeping the main subject in sharp focus.' },
    { name: 'Tingkatkan Detail', prompt: 'Slightly enhance the sharpness and details of the image without making it look unnatural.' },
    { name: 'Cahaya Lebih Hangat', prompt: 'Adjust the color temperature to give the image warmer, golden-hour style lighting.' },
    { name: 'Lampu Studio', prompt: 'Add dramatic, professional studio lighting to the main subject.' },
  ];

  const activePrompt = selectedPresetPrompt || customPrompt;

  const handlePresetClick = (prompt: string) => {
    setSelectedPresetPrompt(prompt);
    setCustomPrompt('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomPrompt(e.target.value);
    setSelectedPresetPrompt(null);
  };

  const handleApply = (applyToAll: boolean) => {
    if (activePrompt) {
      onApply(activePrompt, applyToAll);
    }
  };

  const handleGenerateBackground = () => {
    if (backgroundPrompt) {
        onGenerateBackground(backgroundPrompt);
    }
  }

  const handleBackgroundFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadBackground(e.target.files[0]);
    }
  };
  
  const handleGenerateRandomAdjustPrompt = async () => {
    if (isGeneratingAdjustIdea) return;
    setIsGeneratingAdjustIdea(true);
    setError(null);
    try {
        const idea = await generateRandomPrompt('adjustment');
        setCustomPrompt(idea);
        setSelectedPresetPrompt(null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal.';
        setError(errorMessage);
    } finally {
        setIsGeneratingAdjustIdea(false);
    }
  };

  const handleGenerateRandomBgPrompt = async () => {
    if (isGeneratingBgIdea) return;
    setIsGeneratingBgIdea(true);
    setError(null);
    try {
        const idea = await generateRandomPrompt('background');
        setBackgroundPrompt(idea);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal.';
        setError(errorMessage);
    } finally {
        setIsGeneratingBgIdea(false);
    }
  };

  return (
    <div className="w-full bg-[#4a2c27]/80 border border-[#ECB984]/20 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <div>
        <h3 className="text-lg font-semibold text-center text-[#ECB984]">Terapkan Penyesuaian Profesional</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          {presets.map(preset => (
            <button
              key={preset.name}
              onClick={() => handlePresetClick(preset.prompt)}
              disabled={isLoading}
              className={`w-full text-center bg-[#FFFEE9]/10 border border-transparent text-[#FFFEE9] font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-[#FFFEE9]/20 hover:border-[#FFFEE9]/20 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed ${selectedPresetPrompt === preset.prompt ? 'ring-2 ring-offset-2 ring-offset-[#4a2c27] ring-[#D58258]' : ''}`}
            >
              {preset.name}
            </button>
          ))}
        </div>

        <div className="relative mt-2">
            <input
              type="text"
              value={customPrompt}
              onChange={handleCustomChange}
              placeholder="Atau deskripsikan penyesuaian (contoh: 'ubah latar menjadi hutan')"
              className="flex-grow bg-[#4a2c27] border border-[#ECB984]/30 text-[#FFFEE9] rounded-lg p-4 focus:ring-2 focus:ring-[#D58258] focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base pr-12"
              disabled={isLoading}
            />
            <button
                type="button"
                onClick={handleGenerateRandomAdjustPrompt}
                disabled={isLoading || isGeneratingAdjustIdea}
                className="absolute top-1/2 right-4 -translate-y-1/2 text-[#ECB984]/60 hover:text-[#ECB984] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Dapatkan ide acak"
                title="Dapatkan ide acak dari AI"
            >
                {isGeneratingAdjustIdea ? <LoadingSpinnerIcon className="w-5 h-5"/> : <MagicWandIcon className="w-5 h-5" />}
            </button>
        </div>

        {activePrompt && (
          <div className="animate-fade-in flex flex-col sm:flex-row gap-2 pt-2">
              <button
                  onClick={() => handleApply(false)}
                  className="w-full bg-gradient-to-br from-[#D58258] to-[#c7724a] text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-[#D58258]/20 hover:shadow-xl hover:shadow-[#D58258]/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-[#9d6246] disabled:to-[#8a553c] disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                  disabled={isLoading || !activePrompt.trim()}
              >
                  Terapkan ke Gambar Ini
              </button>
              {isBatchMode && (
                   <button
                      onClick={() => handleApply(true)}
                      className="w-full bg-gradient-to-br from-[#A8A676] to-[#999768] text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-[#A8A676]/20 hover:shadow-xl hover:shadow-[#A8A676]/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-[#7e7c5b] disabled:to-[#6d6b4f] disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                      disabled={isLoading || !activePrompt.trim()}
                  >
                      Terapkan ke Semua
                  </button>
              )}
          </div>
        )}
      </div>
      
      <div className="my-2 border-t border-[#ECB984]/20"></div>

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-center text-[#ECB984]">Penggantian Latar Belakang Konsisten</h3>
        <p className="text-sm text-center text-[#ECB984] -mt-2">Buat latar belakang baru atau unggah milik Anda.</p>
        
        <div className="flex items-center gap-2">
            <div className="relative flex-grow">
                <input
                    type="text"
                    value={backgroundPrompt}
                    onChange={(e) => setBackgroundPrompt(e.target.value)}
                    placeholder="Deskripsikan latar belakang (contoh: 'pantai tenang saat matahari terbenam')"
                    className="flex-grow bg-[#4a2c27] border border-[#ECB984]/30 text-[#FFFEE9] rounded-lg p-4 focus:ring-2 focus:ring-[#D58258] focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base pr-12"
                    disabled={isLoading}
                />
                 <button
                    type="button"
                    onClick={handleGenerateRandomBgPrompt}
                    disabled={isLoading || isGeneratingBgIdea}
                    className="absolute top-1/2 right-4 -translate-y-1/2 text-[#ECB984]/60 hover:text-[#ECB984] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Dapatkan ide acak"
                    title="Dapatkan ide acak dari AI"
                  >
                    {isGeneratingBgIdea ? <LoadingSpinnerIcon className="w-5 h-5"/> : <MagicWandIcon className="w-5 h-5" />}
                  </button>
            </div>
            <button
                onClick={handleGenerateBackground}
                className="bg-gradient-to-br from-[#963A2F] to-[#803127] text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-[#963A2F]/20 hover:shadow-xl hover:shadow-[#963A2F]/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-[#712c24] disabled:to-[#60251d] disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                disabled={isLoading || !backgroundPrompt.trim()}
            >
                Buat
            </button>
        </div>

        <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[#ECB984]/20"></div>
            <span className="flex-shrink mx-4 text-[#ECB984]/60 text-xs uppercase">Atau</span>
            <div className="flex-grow border-t border-[#ECB984]/20"></div>
        </div>

        <div>
            <label 
              htmlFor="background-upload" 
              className={`w-full text-center cursor-pointer bg-[#FFFEE9]/5 border border-[#FFFEE9]/10 text-[#ECB984] font-semibold py-4 px-6 rounded-lg transition-all duration-200 ease-in-out hover:bg-[#FFFEE9]/10 hover:border-[#FFFEE9]/20 active:scale-95 text-base flex items-center justify-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <UploadIcon className="w-5 h-5" />
                Unggah Gambar Latar
            </label>
            <input 
                id="background-upload" 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleBackgroundFileChange} 
                disabled={isLoading}
            />
        </div>

        {generatedBackgroundUrl && (
            <div className="animate-fade-in flex flex-col items-center gap-4 p-4 bg-[#2b1a17]/50 rounded-lg">
                <img src={generatedBackgroundUrl} alt="Generated background" className="w-48 h-auto rounded-md border-2 border-[#ECB984]/30" />
                <div className="w-full flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={() => onApplyBackground(false)}
                        className="w-full bg-gradient-to-br from-[#D58258] to-[#c7724a] text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-[#D58258]/20 hover:shadow-xl hover:shadow-[#D58258]/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-[#9d6246] disabled:to-[#8a553c] disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                        disabled={isLoading}
                    >
                        Terapkan ke Gambar Ini
                    </button>
                    {isBatchMode && (
                         <button
                            onClick={() => onApplyBackground(true)}
                            className="w-full bg-gradient-to-br from-[#A8A676] to-[#999768] text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-[#A8A676]/20 hover:shadow-xl hover:shadow-[#A8A676]/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-[#7e7c5b] disabled:to-[#6d6b4f] disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                            disabled={isLoading}
                        >
                            Terapkan ke Semua
                        </button>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AdjustmentPanel;