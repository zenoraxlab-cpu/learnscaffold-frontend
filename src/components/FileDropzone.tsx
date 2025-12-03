'use client';

import { useState, DragEvent, ChangeEvent } from 'react';

type FileDropzoneProps = {
  onFileSelected?: (file: File) => void;
};

export default function FileDropzone({ onFileSelected }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const picked = files[0];

    const allowedTypes = [
      'application/pdf',
      'application/epub+zip',
      'video/mp4',
      'video/quicktime',
      'video/x-matroska',
    ];

    if (!allowedTypes.includes(picked.type)) {
      setError('Only PDF, EPUB and video files (MP4, MOV, MKV) are supported.');
    } else {
      setError(null);
    }

    setFile(picked);
    onFileSelected?.(picked);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
  };

  const openFileDialog = () => {
    const input = document.getElementById('file-input') as HTMLInputElement | null;
    input?.click();
  };

  return (
    <div className="space-y-4">
      <div
        onClick={openFileDialog}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition',
          isDragging
            ? 'border-blue-500 bg-blue-50/60'
            : 'border-slate-300 bg-slate-50/60 hover:border-slate-400',
        ].join(' ')}
      >
        <p className="text-sm font-medium">
          Drag & drop a file here or click to select
        </p>
        <p className="mt-1 text-xs text-slate-500">
          PDF, EPUB, MP4, MOV, MKV. Up to 200&nbsp;MB.
        </p>

        <input
          id="file-input"
          type="file"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {file && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-900">
          <div className="font-medium truncate">{file.name}</div>
          <div className="text-xs text-slate-500">
            {(file.size / (1024 * 1024)).toFixed(1)} MB
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
