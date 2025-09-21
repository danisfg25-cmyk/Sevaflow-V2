/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';

interface ThumbnailProps {
  imageUrl: string;
  isActive: boolean;
  onClick: () => void;
  'aria-label': string;
}

const Thumbnail: React.FC<ThumbnailProps> = ({ imageUrl, isActive, onClick, 'aria-label': ariaLabel }) => (
  <button 
    onClick={onClick} 
    className={`relative rounded-md overflow-hidden flex-shrink-0 w-20 h-20 md:w-24 md:h-24 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-[#2b1a17] focus:ring-[#D58258] ${isActive ? 'ring-4 ring-[#D58258]' : 'ring-2 ring-transparent hover:ring-[#ECB984]/50'}`}
    aria-label={ariaLabel}
    aria-current={isActive}
  >
    <img src={imageUrl} alt="Thumbnail" className="w-full h-full object-cover" />
  </button>
);


interface ImageState {
  history: File[];
  historyIndex: number;
}

interface ThumbnailStripProps {
  images: ImageState[];
  activeImageIndex: number;
  onSelectImage: (index: number) => void;
}

const ThumbnailStrip: React.FC<ThumbnailStripProps> = ({ images, activeImageIndex, onSelectImage }) => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    // This effect creates Object URLs for the current state of each image.
    const urls = images.map(imgState => {
      const currentFile = imgState.history[imgState.historyIndex];
      return URL.createObjectURL(currentFile);
    });
    setImageUrls(urls);

    // Cleanup function to revoke URLs when component unmounts or images change.
    return () => {
      urls.forEach(URL.revokeObjectURL);
    };
  }, [images]);
  
  if (images.length <= 1) {
    return null;
  }

  return (
    <div className="w-full bg-[#2b1a17]/50 border border-[#ECB984]/20 rounded-lg p-3 backdrop-blur-sm animate-fade-in">
      <div className="flex items-center gap-3 overflow-x-auto pb-2" role="toolbar" aria-label="Thumbnail gambar">
        {imageUrls.map((url, index) => (
          <Thumbnail
            key={`${images[index].history[0].name}-${index}`}
            imageUrl={url}
            isActive={index === activeImageIndex}
            onClick={() => onSelectImage(index)}
            aria-label={`Pilih gambar ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ThumbnailStrip;