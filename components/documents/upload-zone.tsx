"use client"

import { useDropzone } from "react-dropzone"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"

interface UploadZoneProps {
  onFilesUploaded: (files: File[]) => void
  disabled?: boolean
}

export default function UploadZone({ onFilesUploaded, disabled = false }: UploadZoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      onFilesUploaded(acceptedFiles)
    },
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "application/rtf": [".rtf"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
      // Images supported via Gemini 2.0 Flash OCR
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxFiles: 5,
    maxSize: 1 * 1024 * 1024, // 1MB max for any file
    disabled,
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
        isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center text-center">
        <div
          className={`rounded-full p-4 mb-4 ${
            isDragActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          <Upload className={`h-8 w-8 ${isDragActive ? "animate-bounce" : ""}`} />
        </div>
        <h3 className="text-lg font-medium mb-2">
          {isDragActive ? "Drop your files here" : "Drag & drop your business documents here"}
        </h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          or click to browse your files. We support PDF, DOC, DOCX, XLS, XLSX, CSV, JPG, PNG and more. <strong>Max 5 files at once.</strong>
        </p>
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <Badge variant="outline">PDF (1MB)</Badge>
          <Badge variant="outline">DOC/DOCX (1MB)</Badge>
          <Badge variant="outline">TXT/RTF (1MB)</Badge>
          <Badge variant="outline">XLS/XLSX/CSV (1MB)</Badge>
          <Badge variant="outline">JPG/PNG (1MB)</Badge>
        </div>
        <Button variant="outline" className="gap-2 bg-transparent" disabled={disabled}>
          <Upload className="h-4 w-4" /> Select files
        </Button>
      </div>
    </div>
  )
}

