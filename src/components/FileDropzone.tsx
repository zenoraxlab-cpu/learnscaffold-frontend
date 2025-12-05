"use client";

import React, { useCallback, useState } from "react";

export interface FileDropzoneProps {
  onFileUpload: (file: File) => void | Promise<void>;
  disabled?: boolean;
}

export default function FileDropzone({ onFileUpload, disabled = false }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        onFileUpload(files[0]);
      }
    },
    [onFileUpload, disabled]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div
      className={[
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all",
        disabled
          ? "cursor-not-allowed opacity-50 border-gray-500"
          : "cursor-pointer border-emerald-400 hover:bg-emerald-950/20",
        isDragging ? "bg-emerald-900/20" : "",
      ].join(" ")}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => {
        if (!disabled) document.getElementById("file-input-hidden")?.click();
      }}
    >
      <p className="text-sm text-white/80">
        {disabled ? "Please wait…" : "Drag & drop a file or click to upload"}
      </p>

      <input
        id="file-input-hidden"
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled}
      />
    </div>
  );
}
