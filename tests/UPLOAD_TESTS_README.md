# Upload, RAG, and AI Integration Tests

This comprehensive test suite validates the complete upload functionality, RAG (Retrieval-Augmented Generation) processing, and AI analysis capabilities of the DocsFlow system.

## 📋 Test Overview

The test suite covers the entire document lifecycle from upload to AI-powered analysis:

1. **Document Upload** - File upload UI and API functionality
2. **Format Support** - Multiple file format handling (PDF, Word, Excel, CSV, Images)
3. **RAG Processing** - Document chunking, embedding, and vector storage
4. **AI Analysis** - Semantic search and intelligent question answering
5. **Integration** - End-to-end workflow validation

## 🚀 Quick Start

### Run All Upload Tests
```bash
npm run test:upload:all
```

### Run Individual Test Suites
```bash
# Basic upload functionality
npm run test:upload:local

# File format support testing
npm run test:upload:formats

# RAG integration testing
npm run test:upload:rag

# Comprehensive end-to-end testing
npm run test:upload:comprehensive
```

### Run Specific Tests in Headed Mode
```bash
# Run with browser visible for debugging
npx playwright test tests/e2e/local/upload-rag-ai-integration.spec.ts --headed

# Run specific test
npx playwright test -g "should upload document and verify it appears in document list"
```

## 📁 Test Files Structure

```
tests/
├── e2e/local/
│   ├── upload-file-formats.spec.ts          # File format support tests
│   ├── upload-rag-ai-integration.spec.ts    # RAG and AI integration tests
│   ├── upload-rag-ai-comprehensive.spec.ts  # Comprehensive workflow tests
│   └── document-upload.spec.ts              # Basic upload functionality
├── fixtures/                                # Test data files
│   ├── rag-test-document.txt               # RAG integration test data
│   ├── ai-chat-test.txt                    # AI analysis test data
│   ├── company-alpha.txt                   # Multi-document test data A
│   ├── company-beta.txt                    # Multi-document test data B
│   ├── project-status.txt                  # Context retention test data
│   └── rag-architecture.txt                # Technical document test data
└── scripts/
    └── run-upload-tests.ts                  # Test runner script
```

## 🧪 Test Categories

### 1. Basic Upload Functionality (`upload-file-formats.spec.ts`)

Tests core upload capabilities:
- ✅ PDF document processing
- ✅ Word document handling (.docx)
- ✅ Excel spreadsheet processing (.xlsx)
- ✅ CSV file handling
- ✅ Image file processing (PNG, JPEG)
- ✅ File size validation
- ✅ Unsupported format handling
- ✅ Special character filenames
- ✅ Multiple simultaneous uploads
- ✅ Empty file handling

### 2. RAG Integration (`upload-rag-ai-integration.spec.ts`)

Tests RAG processing and AI capabilities:
- ✅ Document upload and processing verification
- ✅ RAG search functionality
- ✅ AI question answering about uploaded content
- ✅ Multi-document cross-referencing
- ✅ Error handling and graceful degradation
- ✅ Document chunk retrieval and relevance
- ✅ Conversation context maintenance

### 3. Comprehensive Workflow (`upload-rag-ai-comprehensive.spec.ts`)

Tests complete end-to-end workflows:
- ✅ Complete upload → process → search → analyze workflow
- ✅ Multi-document knowledge synthesis
- ✅ Technical document understanding
- ✅ Contextual conversation memory
- ✅ Numerical data extraction and calculation
- ✅ Error handling and edge cases
- ✅ System performance under load
- ✅ Document chunking and embedding validation
- ✅ Semantic vs keyword search capabilities

## 📊 Test Scenarios

### Real-World Business Scenarios

1. **Company Comparison Analysis**
   - Upload multiple company profiles
   - Ask comparative questions
   - Verify cross-document analysis

2. **Project Management Workflow**
   - Upload project status documents
   - Test contextual conversation
   - Verify detail extraction

3. **Technical Documentation**
   - Upload technical architecture docs
   - Test section-specific retrieval
   - Verify technical term understanding

4. **Financial Data Processing**
   - Upload documents with numerical data
   - Test calculation and aggregation
   - Verify accuracy of extracted metrics

## 🔧 Configuration

### Environment Requirements

Ensure these environment variables are set:
```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Test User Setup

Tests use the following test account:
- Email: `test1@example.com`
- Password: `Testing123?`

Ensure this user exists in your test database.

## 📈 Performance Benchmarks

### Expected Performance Metrics

- **Upload Time**: < 10 seconds per document
- **Processing Time**: < 30 seconds for text extraction and chunking
- **Query Response**: < 5 seconds for AI responses
- **Multi-document Analysis**: < 10 seconds for cross-document queries

### Load Testing

The comprehensive test suite includes performance validation:
- Multiple simultaneous uploads
- Rapid-fire query testing
- Large document processing
- System responsiveness under load

## 🐛 Debugging Guide

### Common Issues and Solutions

1. **Upload Timeouts**
   ```bash
   # Increase timeout in test configuration
   test.setTimeout(60000);
   ```

2. **AI Service Unavailable**
   - Check API key configuration
   - Verify network connectivity
   - Review service status

3. **Document Processing Failures**
   - Check Supabase connection
   - Verify database schema
   - Review embedding service status

4. **Chat Interface Not Responding**
   - Verify authentication status
   - Check for JavaScript errors
   - Review network requests

### Debug Mode

Run tests in debug mode for detailed output:
```bash
DEBUG=pw:api npx playwright test tests/e2e/local/upload-rag-ai-integration.spec.ts --headed
```

## 📝 Test Data

### Fixture Files

The test suite includes carefully crafted test data:

- **rag-test-document.txt**: Contains structured test data with specific IDs and metrics
- **ai-chat-test.txt**: Business document with numerical data and organizational info
- **company-alpha.txt & company-beta.txt**: Paired documents for comparison testing
- **project-status.txt**: Project management document for context testing
- **rag-architecture.txt**: Technical documentation for section-based retrieval

### Dynamic Test Data

Tests also generate dynamic content to ensure robustness:
- Mock PDF structures
- Temporary CSV data
- Generated numerical datasets

## 🎯 Success Criteria

### Upload Tests Pass When:
- All file formats upload successfully
- Processing completes within timeout limits
- Documents appear in the document list
- Error handling works for invalid files

### RAG Tests Pass When:
- Documents are properly chunked and embedded
- Semantic search returns relevant results
- AI responses contain expected information
- Cross-document analysis works correctly

### Integration Tests Pass When:
- Complete workflow executes successfully
- Performance benchmarks are met
- Error scenarios are handled gracefully
- User experience remains smooth

## 🔄 Continuous Integration

### GitHub Actions Integration

Add to your CI pipeline:
```yaml
- name: Run Upload Tests
  run: npm run test:upload:all

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: upload-test-results
    path: test-results/
```

### Test Reporting

The test runner generates detailed reports including:
- Pass/fail status for each test suite
- Performance metrics and timing
- Error details and troubleshooting guidance
- Recommendations for improvements

## 📞 Support

If tests fail consistently:

1. **Check System Status**
   - Verify all services are running
   - Check database connectivity
   - Confirm AI service availability

2. **Review Logs**
   - Check browser console for errors
   - Review server logs for API issues
   - Examine database logs for processing errors

3. **Manual Testing**
   - Test upload functionality manually
   - Verify chat interface works
   - Check document processing in UI

4. **Contact Support**
   - Provide test output and logs
   - Include environment details
   - Share reproduction steps

## 🎉 Conclusion

This comprehensive test suite ensures that the upload, RAG, and AI integration features work correctly across all scenarios. Regular execution of these tests helps maintain system reliability and user experience quality.

For questions or improvements to the test suite, please refer to the development team or create an issue in the project repository.
