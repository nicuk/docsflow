import { DocumentType, DocumentStatus } from "@/lib/document-utils"

export type DocumentCategory = "contracts" | "invoices" | "reports" | "correspondence" | "uncategorized"

export interface Document {
  id: string
  name: string
  type: DocumentType
  size: number
  pages?: number
  wordCount?: number
  uploadDate: Date
  status: DocumentStatus
  category: DocumentCategory
  tags: string[]
  favorite: boolean
  thumbnail?: string
  processingTime?: number
  errorMessage?: string
  shared?: boolean
}

// Sample documents data (for development/testing)
export const sampleDocuments: Document[] = [
  {
    id: "doc-1",
    name: "Financial Report Q3 2023.pdf",
    type: "pdf",
    size: 2400000, // 2.4 MB
    pages: 24,
    wordCount: 5430,
    uploadDate: new Date(2023, 9, 15), // Oct 15, 2023
    status: "ready",
    category: "reports",
    tags: ["financial", "quarterly", "2023"],
    favorite: true,
    processingTime: 8.2,
  },
  {
    id: "doc-2",
    name: "Marketing Strategy.docx",
    type: "docx",
    size: 1800000, // 1.8 MB
    pages: 15,
    wordCount: 3200,
    uploadDate: new Date(2023, 10, 2), // Nov 2, 2023
    status: "ready",
    category: "reports",
    tags: ["marketing", "strategy"],
    favorite: false,
    processingTime: 5.7,
  },
  {
    id: "doc-3",
    name: "Sales Data Q4.xlsx",
    type: "xlsx",
    size: 3500000, // 3.5 MB
    uploadDate: new Date(2023, 11, 10), // Dec 10, 2023
    status: "ready",
    category: "reports",
    tags: ["sales", "quarterly", "2023"],
    favorite: false,
    processingTime: 12.3,
  },
  {
    id: "doc-4",
    name: "Product Roadmap 2024.pdf",
    type: "pdf",
    size: 4200000, // 4.2 MB
    pages: 32,
    wordCount: 7800,
    uploadDate: new Date(2023, 11, 28), // Dec 28, 2023
    status: "processing",
    category: "reports",
    tags: ["product", "roadmap", "2024"],
    favorite: true,
  },
  {
    id: "doc-5",
    name: "Team Photo.jpg",
    type: "jpg",
    size: 5600000, // 5.6 MB
    uploadDate: new Date(2024, 0, 5), // Jan 5, 2024
    status: "ready",
    category: "correspondence",
    tags: ["team", "photo"],
    favorite: false,
    processingTime: 3.1,
  },
  {
    id: "doc-6",
    name: "Contract Draft.pdf",
    type: "pdf",
    size: 1200000, // 1.2 MB
    pages: 8,
    wordCount: 2100,
    uploadDate: new Date(2024, 0, 15), // Jan 15, 2024
    status: "error",
    category: "contracts",
    tags: ["legal", "draft"],
    favorite: false,
    errorMessage:
      "Failed to extract text from document. The PDF may be password protected or contain only scanned images.",
  },
  {
    id: "doc-7",
    name: "Budget 2024.xlsx",
    type: "xlsx",
    size: 2100000, // 2.1 MB
    uploadDate: new Date(2024, 0, 20), // Jan 20, 2024
    status: "ready",
    category: "reports",
    tags: ["finance", "budget", "2024"],
    favorite: true,
    processingTime: 7.8,
    shared: true,
  },
  {
    id: "doc-8",
    name: "Invoice #INV-2023-0042.pdf",
    type: "pdf",
    size: 980000, // 980 KB
    pages: 2,
    wordCount: 450,
    uploadDate: new Date(2024, 0, 25), // Jan 25, 2024
    status: "ready",
    category: "invoices",
    tags: ["invoice", "paid"],
    favorite: false,
    processingTime: 2.3,
  },
  {
    id: "doc-9",
    name: "Meeting Notes - Product Team.txt",
    type: "txt",
    size: 45000, // 45 KB
    pages: 1,
    wordCount: 850,
    uploadDate: new Date(2024, 1, 2), // Feb 2, 2024
    status: "ready",
    category: "correspondence",
    tags: ["meeting", "notes", "product"],
    favorite: false,
    processingTime: 1.2,
  },
  {
    id: "doc-10",
    name: "Customer Feedback Analysis.csv",
    type: "csv",
    size: 1500000, // 1.5 MB
    uploadDate: new Date(2024, 1, 10), // Feb 10, 2024
    status: "ready",
    category: "reports",
    tags: ["customer", "feedback", "analysis"],
    favorite: false,
    processingTime: 6.5,
  },
]

