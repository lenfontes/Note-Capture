import '@testing-library/jest-dom';
import sinonChrome from 'sinon-chrome';

global.chrome = sinonChrome;

// Reset all chrome API mocks before each test
beforeEach(() => {
  sinonChrome.storage.sync.get.flush();
  sinonChrome.storage.sync.set.flush();
  sinonChrome.storage.local.get.flush();
  sinonChrome.storage.local.set.flush();
  sinonChrome.runtime.sendMessage.flush();
  sinonChrome.identity.getAuthToken.flush();
  sinonChrome.notifications.create.flush();
});

// Clean up after all tests
afterAll(() => {
  sinonChrome.flush();
});
