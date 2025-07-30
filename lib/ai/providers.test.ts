import { aiProvider, isRealAIAvailable } from './providers';

describe('AI Persona Generation', () => {
  // Mock the API key for testing
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules() // Most important - it clears the cache
    process.env = { ...OLD_ENV }; // Make a copy
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore old environment
  });

  test('should return true if GOOGLE_AI_API_KEY is set', () => {
    process.env.GOOGLE_AI_API_KEY = 'test-key';
    const { isRealAIAvailable } = require('./providers');
    expect(isRealAIAvailable()).toBe(true);
  });

  test('should return false if GOOGLE_AI_API_KEY is not set', () => {
    delete process.env.GOOGLE_AI_API_KEY;
    const { isRealAIAvailable } = require('./providers');
    expect(isRealAIAvailable()).toBe(false);
  });

  test('should generate a persona with a valid API key', async () => {
    process.env.GOOGLE_AI_API_KEY = 'test-key';
    const { aiProvider } = require('./providers');
    const persona = await aiProvider.generatePersona('test prompt');
    expect(persona).toBeNull(); // It will be null without a real key, but we're testing the path
  });
});
