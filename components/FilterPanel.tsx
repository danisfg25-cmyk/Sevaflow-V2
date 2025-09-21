/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { MagicWandIcon, LoadingSpinnerIcon } from './icons';
import { generateRandomPrompt } from '../services/geminiService';

interface FilterPanelProps {
  onApply: (prompt: string, applyToAll: boolean) => void;
  isLoading: boolean;
  isBatchMode: boolean;
  setError: (error: string | null) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ onApply, isLoading, isBatchMode, setError }) => {
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);

  const presets = [
    { name: 'Synthwave', prompt: 'Apply a vibrant 80s synthwave aesthetic with neon magenta and cyan glows, and subtle scan lines.' },
    { name: 'Anime', prompt: 'Give the image a vibrant Japanese anime style, with bold outlines, cel-shading, and saturated colors.' },
    { name: 'Lomo', prompt: 'Apply a Lomography-style cross-processing film effect with high-contrast, oversaturated colors, and dark vignetting.' },
    { name: 'Glitch', prompt: 'Transform the image into a futuristic holographic projection with digital glitch effects and chromatic aberration.' },
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

  const handleGenerateRandomPrompt = async () => {
    if (isGeneratingIdea) return;
    setIsGeneratingIdea(true);
    setError(null);
    try {
        const idea = await generateRandomPrompt('filter');
        setCustomPrompt(idea);
        setSelectedPresetPrompt(null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal.';
        setError(errorMessage);
    } finally {
        setIsGeneratingIdea(false);
    }
  };


  return (
    <div className="w-full bg-[#4a2c27]/80 border border-[#ECB984]/20 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-center text-[#ECB984]">Terapkan Filter</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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

      <div className="relative">
          <input
            type="text"
            value={customPrompt}
            onChange={handleCustomChange}
            placeholder="Atau deskripsikan filter kustom (contoh: 'cahaya synthwave 80-an')"
            className="flex-grow bg-[#4a2c27] border border-[#ECB984]/30 text-[#FFFEE9] rounded-lg p-4 focus:ring-2 focus:ring-[#D58258] focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base pr-12"
            disabled={isLoading}
          />
          <button
              type="button"
              onClick={handleGenerateRandomPrompt}
              disabled={isLoading || isGeneratingIdea}
              className="absolute top-1/2 right-4 -translate-y-1/2 text-[#ECB984]/60 hover:text-[#ECB984] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Dapatkan ide acak"
              title="Dapatkan ide acak dari AI"
          >
              {isGeneratingIdea ? <LoadingSpinnerIcon className="w-5 h-5"/> : <MagicWandIcon className="w-5 h-5" />}
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
  );
};

export default FilterPanel;