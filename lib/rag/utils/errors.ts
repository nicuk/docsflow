/**
 * Custom Error Classes for RAG Module
 * 
 * Provides specific error types for better error handling and debugging.
 */

export class RAGError extends Error {
  constructor(message: string, public context?: Record<string, any>) {
    super(message);
    this.name = 'RAGError';
  }
}

export class EmbeddingError extends RAGError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
    this.name = 'EmbeddingError';
  }
}

export class RetrievalError extends RAGError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
    this.name = 'RetrievalError';
  }
}

export class GenerationError extends RAGError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
    this.name = 'GenerationError';
  }
}

export class StorageError extends RAGError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
    this.name = 'StorageError';
  }
}

export class ValidationError extends RAGError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
    this.name = 'ValidationError';
  }
}

export class QueryWorkflowError extends RAGError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
    this.name = 'QueryWorkflowError';
  }
}

export class IngestWorkflowError extends RAGError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
    this.name = 'IngestWorkflowError';
  }
}

export class DeleteWorkflowError extends RAGError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
    this.name = 'DeleteWorkflowError';
  }
}

