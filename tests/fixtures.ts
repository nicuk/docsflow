import { test as base, expect } from '@playwright/test';
import { ChatPage } from './pages/chat';

// Extend basic test by providing a "chatPage" fixture
type TestFixtures = {
  chatPage: ChatPage;
};

export const test = base.extend<TestFixtures>({
  chatPage: async ({ page }, use) => {
    const chatPage = new ChatPage(page);
    await use(chatPage);
  },
});

export { expect };
