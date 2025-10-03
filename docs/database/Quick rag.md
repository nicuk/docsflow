based on running @quick-rag-quality-check.sql


[
  {
    "subdomain": "bitto",
    "tenant_id": "122928f6-f34e-484b-9a69-7e1f25caf45c",
    "doc_count": 28,
    "chunk_count": 53
  },
  {
    "subdomain": "sculptai",
    "tenant_id": "b89b8fab-0a25-4266-a4d0-306cc4d358cb",
    "doc_count": 16,
    "chunk_count": 98
  },
  {
    "subdomain": "test-company",
    "tenant_id": "96bbb531-dbb5-499f-bae9-416a43a87e68",
    "doc_count": 2,
    "chunk_count": 15
  },
  {
    "subdomain": "playwright-test",
    "tenant_id": "6169f0e3-7a47-47ab-a96f-f00949a73f2b",
    "doc_count": 0,
    "chunk_count": 0
  }
][
  {
    "result": "✅ No tenant mismatches found"
  }
]
[
  {
    "total_chunks": 166,
    "chunks_with_embeddings": 159,
    "embedding_coverage_pct": "95.8",
    "status": "⚠️ Some chunks missing embeddings"
  }
][
  {
    "test": "=== SIMILARITY SEARCH TEST ==="
  }
][
  {
    "similarity_range": "0.9-1.0 (Very High)",
    "count": 13,
    "avg_similarity": "0.957"
  },
  {
    "similarity_range": "0.8-0.9 (High)",
    "count": 18,
    "avg_similarity": "0.837"
  },
  {
    "similarity_range": "0.7-0.8 (Medium)",
    "count": 11,
    "avg_similarity": "0.746"
  },
  {
    "similarity_range": "0.5-0.7 (Low)",
    "count": 318,
    "avg_similarity": "0.532"
  },
  {
    "similarity_range": "0.0-0.5 (Very Low)",
    "count": 140,
    "avg_similarity": "0.483"
  }
][
  {
    "total_documents": 46,
    "missing_filename": 0,
    "missing_tenant_id": 0,
    "empty_metadata": 45,
    "status": "✅ All documents have required fields"
  }
][
  {
    "subdomain": "bitto",
    "filename": "hybridt1.xlsx",
    "processing_status": "error",
    "chunk_count": 0,
    "embedded_chunks": 0
  },
  {
    "subdomain": "bitto",
    "filename": "image_480.png",
    "processing_status": "completed",
    "chunk_count": 1,
    "embedded_chunks": 1
  },
  {
    "subdomain": "bitto",
    "filename": "SAFT Agreement.docx",
    "processing_status": "completed",
    "chunk_count": 4,
    "embedded_chunks": 4
  },
  {
    "subdomain": "bitto",
    "filename": "SAFT Agreement.docx",
    "processing_status": "completed",
    "chunk_count": 4,
    "embedded_chunks": 4
  },
  {
    "subdomain": "bitto",
    "filename": "Screenshot 2024-11-23 174329.png",
    "processing_status": "error",
    "chunk_count": 0,
    "embedded_chunks": 0
  },
  {
    "subdomain": "bitto",
    "filename": "Screenshot 2024-11-24 194043.png",
    "processing_status": "completed",
    "chunk_count": 3,
    "embedded_chunks": 3
  },
  {
    "subdomain": "bitto",
    "filename": "Screenshot 2024-11-24 200013.png",
    "processing_status": "completed",
    "chunk_count": 2,
    "embedded_chunks": 2
  },
  {
    "subdomain": "bitto",
    "filename": "Screenshot 2024-11-24 200013.png",
    "processing_status": "completed",
    "chunk_count": 3,
    "embedded_chunks": 3
  },
  {
    "subdomain": "bitto",
    "filename": "Screenshot 2024-11-24 200013.png",
    "processing_status": "completed",
    "chunk_count": 2,
    "embedded_chunks": 2
  },
  {
    "subdomain": "bitto",
    "filename": "Screenshot 2024-11-24 200013.png",
    "processing_status": "completed",
    "chunk_count": 3,
    "embedded_chunks": 3
  },
  {
    "subdomain": "bitto",
    "filename": "Screenshot 2024-11-24 202232.png",
    "processing_status": "completed",
    "chunk_count": 3,
    "embedded_chunks": 3
  },
  {
    "subdomain": "bitto",
    "filename": "Screenshot 2024-11-24 202232.png",
    "processing_status": "error",
    "chunk_count": 3,
    "embedded_chunks": 3
  },
  {
    "subdomain": "bitto",
    "filename": "Screenshot 2024-11-25 073348.png",
    "processing_status": "completed",
    "chunk_count": 3,
    "embedded_chunks": 3
  },
  {
    "subdomain": "bitto",
    "filename": "Screenshot 2024-11-25 112254.png",
    "processing_status": "completed",
    "chunk_count": 7,
    "embedded_chunks": 7
  },
  {
    "subdomain": "bitto",
    "filename": "Screenshot 2024-11-25 112304.png",
    "processing_status": "error",
    "chunk_count": 0,
    "embedded_chunks": 0
  },
  {
    "subdomain": "bitto",
    "filename": "Screenshot 2024-11-25 112316.png",
    "processing_status": "error",
    "chunk_count": 0,
    "embedded_chunks": 0
  },
  {
    "subdomain": "bitto",
    "filename": "Screenshot 2024-11-25 112328.png",
    "processing_status": "error",
    "chunk_count": 0,
    "embedded_chunks": 0
  },
  {
    "subdomain": "bitto",
    "filename": "Screenshot 2024-11-25 112336.png",
    "processing_status": "error",
    "chunk_count": 0,
    "embedded_chunks": 0
  },
  {
    "subdomain": "bitto",
    "filename": "Screenshot 2024-11-25 112348.png",
    "processing_status": "error",
    "chunk_count": 0,
    "embedded_chunks": 0
  },
  {
    "subdomain": "bitto",
    "filename": "Screenshot 2024-11-25 112549.png",
    "processing_status": "error",
    "chunk_count": 0,
    "embedded_chunks": 0
  }
]