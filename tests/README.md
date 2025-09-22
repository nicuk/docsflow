# DocsFlow.app E2E Test Suite

This comprehensive Playwright test suite validates the core functionality of DocsFlow.app, including chat functionality, document upload capabilities, and remember me authentication.

## 📁 **Organized Test Structure**

```
tests/
├── e2e/
│   ├── local/                    # Tests for local development
│   │   ├── chat-functionality.spec.ts
│   │   ├── document-upload.spec.ts
│   │   ├── remember-me-authentication.spec.ts
│   │   └── integrated-functionality.spec.ts
│   └── production/               # Tests for Vercel deployment
│       ├── auth-session-timing.spec.ts
│       └── chat-functionality.spec.ts
├── fixtures/                     # Test data files
├── utils/                        # Test utilities and helpers
├── configs/                      # Test configurations
│   ├── playwright.config.prod.ts
│   ├── global-setup.prod.ts
│   └── global-teardown.prod.ts
├── pages/                        # Page object models
└── reports/                      # Test results and reports
```

## 🧪 Test Coverage

### 1. Chat Functionality Tests (`chat-functionality.spec.ts`)
- **Chat Interface Loading**: Verifies chat components load correctly
- **Message Sending**: Tests user message submission and AI responses
- **Conversation History**: Validates conversation persistence and switching
- **File Upload in Chat**: Tests document attachment in chat interface
- **Confidence Levels**: Checks AI response confidence indicators
- **Keyboard Shortcuts**: Tests Enter/Shift+Enter functionality
- **Session Persistence**: Verifies chat state survives page refresh
- **Error Handling**: Tests network errors and API timeouts

### 2. Document Upload Tests (`document-upload.spec.ts`)
- **Upload Interface**: Verifies upload buttons and zones are visible
- **Single File Upload**: Tests individual file upload functionality
- **Multiple File Upload**: Tests batch file upload capability
- **Drag & Drop**: Validates drag and drop upload mechanism
- **Upload Progress**: Tests progress indicators during upload
- **File Type Support**: Tests various file formats (PDF, DOCX, TXT, etc.)
- **Error Handling**: Tests upload failures and size limit validation
- **Document List**: Verifies uploaded documents appear in list
- **Document Actions**: Tests delete, download, and management features
- **Chat Integration**: Tests uploading documents from chat interface

### 3. Remember Me Authentication (`remember-me-authentication.spec.ts`)
- **Login with Remember Me**: Tests checkbox functionality
- **Session Persistence**: Validates long-term session storage
- **Browser Restart**: Tests session survival across browser restarts
- **Session Expiry**: Validates session timeout without remember me
- **Multi-tab Support**: Tests session sharing across browser tabs
- **Security**: Validates cookie security attributes
- **Logout Cleanup**: Tests proper session cleanup on logout
- **Multiple Users**: Tests remember me with different accounts

### 4. Integrated Functionality (`integrated-functionality.spec.ts`)
- **Complete Workflow**: Login → Upload → Chat workflow testing
- **Cross-Feature Integration**: Tests how all features work together
- **Performance Testing**: Measures upload and response times
- **Stress Testing**: Rapid operations and multiple chat messages
- **Data Consistency**: Validates data accuracy across features
- **Accessibility**: Basic accessibility checks across all pages

## 🚀 Running Tests

### Prerequisites
Ensure your environment is set up:
```bash
# Install dependencies
npm install

# Environment variables should be set
export NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_key"
export TEST_EMAIL="test@example.com"
export TEST_PASSWORD="testpassword123"
```

### Local Development Tests
```bash
# Run all local tests (against localhost:3000)
npm run test:local

# Individual local test suites
npm run test:chat:local        # Chat functionality
npm run test:auth:local        # Remember me authentication  
npm run test:upload:local      # Document upload
npm run test:integrated:local  # Integrated functionality
```

### Production Tests (Vercel Deployment)
```bash
# Run all production tests (against docsflow.app)
npm run test:production

# Individual production test suites  
npm run test:chat:production   # Chat functionality on production
npm run test:auth:production   # Session timing and auth issues
```

### Combined Testing
```bash
# Run both local and production tests
npm run test:playwright
```

### Development & Debugging
```bash
# Run tests with visual interface
npm run test:playwright:ui

# Run tests in headed mode (visible browser)
npm run test:playwright:headed

# Debug specific test
npm run test:playwright:debug

# View test reports
npm run test:playwright:report
```

### Advanced Options
```bash
# Run tests in parallel (default)
playwright test --workers=4

# Run tests in specific browser
playwright test --project=chromium
playwright test --project=firefox
playwright test --project=webkit

# Run tests with different viewport
playwright test --device="iPhone 12"
playwright test --device="Desktop Chrome"

# Run specific test file
playwright test tests/e2e/chat-functionality.spec.ts

# Run specific test by name
playwright test --grep "should send a message and receive response"
```

## 📁 Test Structure

```
tests/
├── README.md                           # This file
├── playwright.config.ts                # Playwright configuration
├── test-runner.ts                      # Test utilities and helpers
├── fixtures/                          # Test files for upload testing
│   ├── test-document.txt
│   ├── test-document-1.txt
│   ├── test-document-2.txt
│   ├── large-test-document.pdf
│   ├── test.pdf
│   ├── test.xlsx
│   ├── test.pptx
│   └── test.txt
├── e2e/                               # End-to-end test files
│   ├── chat-functionality.spec.ts
│   ├── document-upload.spec.ts
│   ├── remember-me-authentication.spec.ts
│   └── integrated-functionality.spec.ts
└── test-results/                      # Generated reports and screenshots
```

## 🔧 Test Configuration

### Environment Variables
- `BASE_URL`: Application base URL (default: http://localhost:3000)
- `TEST_EMAIL`: Test user email (default: test@example.com)
- `TEST_PASSWORD`: Test user password (default: testpassword123)

### Playwright Configuration
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: On failure only
- **Videos**: Retained on failure
- **Traces**: On first retry

## 📊 Test Reports

After running tests, reports are generated in:
- `playwright-report/index.html` - Interactive HTML report
- `test-results/` - Screenshots and videos of failures

View reports with:
```bash
npm run test:playwright:report
```

## 🛠 Test Utilities

The `test-runner.ts` file provides helpful utilities:

```typescript
import { TestUtils } from '../test-runner';

// Setup authenticated session
await TestUtils.setupAuth(page, config, rememberMe);

// Check authentication status
const isAuth = await TestUtils.isAuthenticated(page);

// Upload file helper
await TestUtils.uploadFile(page, filePath);

// Send chat message
await TestUtils.sendChatMessage(page, message);

// Wait for AI response
await TestUtils.waitForAiResponse(page);

// Check for API errors
const errors = await TestUtils.checkForApiErrors(page);
```

## 🚨 Troubleshooting

### Common Issues

1. **Tests failing due to authentication**
   - Verify TEST_EMAIL and TEST_PASSWORD are correct
   - Check if test user exists in your database
   - Ensure Supabase environment variables are set

2. **Upload tests failing**
   - Verify test fixture files exist in `tests/fixtures/`
   - Check file permissions
   - Ensure upload API is functional

3. **Chat tests timing out**
   - AI responses may take time; adjust timeouts if needed
   - Check if AI service (Google Gemini) is configured
   - Verify chat API is responding

4. **Remember me tests inconsistent**
   - Clear browser state between tests
   - Check cookie domain settings
   - Verify session management implementation

### Debug Mode
Run tests with debug mode for step-by-step execution:
```bash
npm run test:playwright:debug
```

### Test Data Cleanup
Tests automatically clean up:
- Browser cookies and storage
- Uploaded test files (if cleanup is implemented)
- Session data

## 📈 Test Metrics

Current test coverage includes:
- **25+ individual test cases**
- **4 major functionality areas**
- **Multiple browser testing**
- **Mobile device testing**
- **Error scenario testing**
- **Performance validation**
- **Accessibility checks**

## 🔄 CI/CD Integration

For continuous integration, add to your workflow:

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:all-e2e
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

## 🤝 Contributing

When adding new tests:
1. Follow existing naming conventions
2. Use the provided test utilities
3. Add appropriate test fixtures if needed
4. Include both positive and negative test cases
5. Update this README with new test descriptions

## 📝 Test Maintenance

Regular maintenance tasks:
- Update test fixtures as application evolves
- Adjust timeouts based on performance changes
- Update selectors if UI components change
- Add new test cases for new features
- Review and update test data

---

**Note**: These tests are designed to work with the DocsFlow.app application structure. Adjust selectors, URLs, and expectations based on your specific implementation.
