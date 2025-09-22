# Chat Interface Testing Guide

## Overview
Your chat interface now has comprehensive Playwright test coverage with three test suites:

### 1. **Original Tests** (`tests/e2e/local/chat-functionality.spec.ts`)
- ✅ Basic chat interface functionality
- ✅ Message sending and receiving
- ✅ File upload handling
- ✅ Conversation management
- ✅ Error handling scenarios

### 2. **Enhanced Tests** (`tests/e2e/local/enhanced-chat-functionality.spec.ts`)
- ✅ UI component verification
- ✅ Confidence indicators and sources
- ✅ Conversation persistence
- ✅ Export functionality
- ✅ Responsive design
- ✅ API integration testing

### 3. **Page Object Model Tests** (`tests/e2e/local/chat-page-object.spec.ts`)
- ✅ Clean, maintainable test structure
- ✅ Reusable page methods
- ✅ Better error handling
- ✅ Comprehensive feature coverage

## Running the Tests

### Run All Chat Tests
```bash
npx playwright test tests/e2e/local/chat
```

### Run Specific Test Files
```bash
# Original functionality tests
npx playwright test tests/e2e/local/chat-functionality.spec.ts

# Enhanced feature tests  
npx playwright test tests/e2e/local/enhanced-chat-functionality.spec.ts

# Page object model tests
npx playwright test tests/e2e/local/chat-page-object.spec.ts
```

### Run with Different Browsers
```bash
# Chrome only
npx playwright test --project=chromium tests/e2e/local/chat

# All browsers
npx playwright test --project=chromium --project=firefox --project=webkit tests/e2e/local/chat
```

### Run in Headed Mode (See Browser)
```bash
npx playwright test --headed tests/e2e/local/chat
```

### Run with Debug Mode
```bash
npx playwright test --debug tests/e2e/local/chat-page-object.spec.ts
```

## Test Coverage

### ✅ **User Interface Tests**
- Header elements (logo, buttons, navigation)
- Input field states and validation
- Loading indicators and animations
- Responsive design across viewports
- Accessibility of UI components

### ✅ **Chat Functionality Tests**
- Welcome message display
- Message sending and receiving
- AI response handling
- Loading states and timeouts
- Conversation history management
- Conversation switching

### ✅ **File Management Tests**
- File upload via attachment button
- Multiple file upload support
- Upload progress and feedback
- File type validation

### ✅ **Advanced Features Tests**
- Confidence level indicators
- Source document citations
- Follow-up suggestions
- Citation modal interactions
- Export functionality

### ✅ **Error Handling Tests**
- Network errors
- API timeouts
- Malformed responses
- Rate limiting
- Graceful degradation

### ✅ **Integration Tests**
- Real API interactions
- Authentication flow
- Session persistence
- Cross-conversation data

## Key Test Features

### **Enhanced Page Object Model**
The `ChatPage` class provides clean, reusable methods:
```typescript
// Navigate to chat
await chatPage.goto();

// Send message and wait for response
await chatPage.sendMessageAndWaitForResponse('Test message');

// Handle file uploads
await chatPage.uploadFileViaButton(filePath);

// Manage conversations
await chatPage.createNewConversation();
await chatPage.switchToConversation(0);

// Export chat history
const download = await chatPage.exportChat();
```

### **Comprehensive Selectors**
Tests use robust selectors that work with your actual UI:
- `button:has([data-testid="send"], .lucide-send)` - Send button
- `text=AI Assistant` - AI response indicator
- `button:has([data-testid="paperclip"], .lucide-paperclip)` - Attachment button
- `text=Analyzing documents...` - Loading indicator

### **Error Scenario Testing**
Tests simulate real-world error conditions:
- API failures
- Network timeouts
- Malformed responses
- Server errors

## Test Configuration

Your `playwright.config.ts` is already configured with:
- ✅ Multiple browser testing
- ✅ Screenshot on failure
- ✅ Video recording on failure
- ✅ Local development server
- ✅ Proper timeouts and retries

## Running Tests in CI/CD

For continuous integration, use:
```bash
# CI mode with retries
CI=true npx playwright test tests/e2e/local/chat

# Generate test report
npx playwright show-report
```

## Test Data Requirements

### Prerequisites
- Test user: `test1@example.com` with password `Testing123?`
- Test subdomain: `test-company`
- Test documents in `tests/fixtures/`

### Required Files
- `tests/fixtures/test-document.txt` - For upload testing
- Other document types for comprehensive testing

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Ensure test user exists in database
   - Check subdomain configuration
   - Verify session handling

2. **Timing Issues**
   - Increase timeouts for slow responses
   - Add proper wait conditions
   - Use `waitForLoadingToComplete()` method

3. **Selector Issues**
   - Update selectors if UI changes
   - Use data-testid attributes for stability
   - Prefer semantic selectors over brittle ones

### Debug Tips

1. **Run with headed mode** to see what's happening
2. **Use breakpoints** in test code
3. **Check browser console** for JavaScript errors
4. **Review network tab** for API issues

## Next Steps

1. **Add Data-Test-IDs**: Consider adding `data-testid` attributes to key UI elements for more stable selectors
2. **Visual Testing**: Add screenshot comparisons for UI consistency
3. **Performance Testing**: Add timing assertions for response times
4. **Accessibility Testing**: Add a11y testing with @axe-core/playwright
5. **Mock Data**: Create more sophisticated mock responses for testing edge cases

Your chat interface now has comprehensive test coverage that will catch regressions and ensure quality as you continue development! 🚀
