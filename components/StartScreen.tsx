/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { UploadIcon, MagicWandIcon, PaletteIcon, SunIcon } from './icons.tsx';

interface StartScreenProps {
  onFileSelect: (files: FileList | null) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onFileSelect }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect(e.target.files);
  };

  return (
    <div 
      className={`w-full max-w-5xl mx-auto text-center p-8 transition-all duration-300 rounded-2xl border-2 ${isDraggingOver ? 'bg-[#D58258]/10 border-dashed border-[#D58258]' : 'border-transparent'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        onFileSelect(e.dataTransfer.files);
      }}
    >
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <h1 className="text-5xl font-extrabold tracking-tight text-[#FFFEE9] sm:text-6xl md:text-7xl">
          Edit Foto dengan AI, <span className="text-[#D58258]">Jadi Mudah</span>.
        </h1>
        <p className="max-w-2xl text-lg text-[#ECB984] md:text-xl">
          Lakukan retouch, terapkan filter kreatif, atau buat penyesuaian profesional menggunakan perintah teks sederhana. Tanpa perlu alat yang rumit.
        </p>

        <div className="mt-6 flex flex-col items-center gap-4">
            <label htmlFor="image-upload-start" className="relative inline-flex items-center justify-center px-10 py-5 text-xl font-bold text-white bg-gradient-to-br from-[#D58258] to-[#c7724a] rounded-full cursor-pointer group hover:from-[#c7724a] hover:to-[#D58258] transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl shadow-[#D58258]/30 hover:shadow-[#D58258]/40">
                <UploadIcon className="w-6 h-6 mr-3 transition-transform duration-500 ease-in-out group-hover:rotate-[360deg] group-hover:scale-110" />
                Unggah Gambar
            </label>
            <input id="image-upload-start" type="file" className="hidden" accept="image/*" onChange={handleFileChange} multiple />
            <p className="text-sm text-[#ECB984]/70">atau seret dan lepas file</p>
        </div>

        <div className="mt-16 w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-[#4a2c27]/60 p-6 rounded-lg border border-[#ECB984]/20 flex flex-col items-center text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-[#2b1a17] rounded-full mb-4">
                       <MagicWandIcon className="w-6 h-6 text-[#D58258]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#FFFEE9]">Retouch Presisi</h3>
                    <p className="mt-2 text-[#ECB984]">Klik titik mana pun pada gambar Anda untuk menghilangkan noda, mengubah warna, atau menambahkan elemen dengan akurasi tinggi.</p>
                </div>
                <div className="bg-[#4a2c27]/60 p-6 rounded-lg border border-[#ECB984]/20 flex flex-col items-center text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-[#2b1a17] rounded-full mb-4">
                       <PaletteIcon className="w-6 h-6 text-[#D58258]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#FFFEE9]">Filter Kreatif</h3>
                    <p className="mt-2 text-[#ECB984]">Ubah foto dengan gaya artistik. Dari tampilan vintage hingga cahaya futuristik, temukan atau ciptakan filter yang sempurna.</p>
                </div>
                <div className="bg-[#4a2c27]/60 p-6 rounded-lg border border-[#ECB984]/20 flex flex-col items-center text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-[#2b1a17] rounded-full mb-4">
                       <SunIcon className="w-6 h-6 text-[#D58258]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#FFFEE9]">Penyesuaian Pro</h3>
                    <p className="mt-2 text-[#ECB984]">Tingkatkan pencahayaan, buramkan latar belakang, atau ubah suasana. Dapatkan hasil berkualitas studio tanpa alat yang rumit.</p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default StartScreen;