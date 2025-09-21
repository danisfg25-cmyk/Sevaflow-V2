/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface CropPanelProps {
  onApplyCrop: () => void;
  onSetAspect: (aspect: number | undefined) => void;
  isLoading: boolean;
  isCropping: boolean;
}

type AspectRatio = 'bebas' | '1:1' | '16:9';

const CropPanel: React.FC<CropPanelProps> = ({ onApplyCrop, onSetAspect, isLoading, isCropping }) => {
  const [activeAspect, setActiveAspect] = useState<AspectRatio>('bebas');
  
  const handleAspectChange = (aspect: AspectRatio, value: number | undefined) => {
    setActiveAspect(aspect);
    onSetAspect(value);
  }

  const aspects: { name: AspectRatio, value: number | undefined }[] = [
    { name: 'bebas', value: undefined },
    { name: '1:1', value: 1 / 1 },
    { name: '16:9', value: 16 / 9 },
  ];

  return (
    <div className="w-full bg-[#4a2c27]/80 border border-[#ECB984]/20 rounded-lg p-4 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-[#ECB984]">Potong Gambar</h3>
      <p className="text-sm text-[#ECB984] -mt-2">Klik dan seret pada gambar untuk memilih area potong.</p>
      
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[#ECB984]">Rasio Aspek:</span>
        {aspects.map(({ name, value }) => (
          <button
            key={name}
            onClick={() => handleAspectChange(name, value)}
            disabled={isLoading}
            className={`px-4 py-2 rounded-md text-base font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 ${
              activeAspect === name 
              ? 'bg-gradient-to-br from-[#D58258] to-[#c7724a] text-white shadow-md shadow-[#D58258]/30' 
              : 'bg-[#FFFEE9]/10 hover:bg-[#FFFEE9]/20 text-[#FFFEE9]'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <button
        onClick={onApplyCrop}
        disabled={isLoading || !isCropping}
        className="w-full max-w-xs mt-2 bg-gradient-to-br from-[#A8A676] to-[#999768] text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-[#A8A676]/20 hover:shadow-xl hover:shadow-[#A8A676]/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-[#7e7c5b] disabled:to-[#6d6b4f] disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
      >
        Terapkan Potongan
      </button>
    </div>
  );
};

export default CropPanel;