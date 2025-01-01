import { GoogleAPIClient } from '../js/google-api.js';

describe('GoogleAPIClient', () => {
  let googleAPI;
  let originalFetch;
  
  beforeEach(() => {
    googleAPI = new GoogleAPIClient();
    originalFetch = global.fetch;
    global.fetch = () => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({})
    });

    chrome.storage.sync.get.callsFake((key, callback) => {
      callback({});
    });
    chrome.storage.sync.set.callsFake((data, callback) => {
      if (callback) callback();
    });
    chrome.identity.getAuthToken.callsFake((options, callback) => {
      callback('test-token');
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('initialize', () => {
    it('should create new document if no document ID exists', async () => {
      const mockDocId = 'test-doc-id';
      global.fetch = () => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ documentId: mockDocId })
      });

      await googleAPI.initialize();

      expect(chrome.storage.sync.set.calledWith({
        notesDocId: mockDocId
      })).toBe(true);
    });

    it('should use existing document ID if available', async () => {
      const mockDocId = 'existing-doc-id';
      chrome.storage.sync.get.callsFake((key, callback) => {
        callback({ notesDocId: mockDocId });
      });

      await googleAPI.initialize();

      expect(googleAPI.notesDocId).toBe(mockDocId);
      expect(chrome.storage.sync.set.called).toBe(false);
    });
  });

  describe('appendNote', () => {
    const mockNote = {
      text: 'Test note',
      url: 'https://example.com',
      timestamp: '2025-01-01T12:00:00Z',
      category: 'Test'
    };

    beforeEach(async () => {
      googleAPI.notesDocId = 'test-doc-id';
    });

    it('should append note to document', async () => {
      let requestBody;
      global.fetch = (url, options) => {
        requestBody = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      };

      await googleAPI.appendNote(mockNote);

      expect(requestBody.requests[0].insertText.text).toContain('Test note');
      expect(requestBody.requests[0].insertText.text).toContain('https://example.com');
    });

    it('should throw error on API failure', async () => {
      global.fetch = () => Promise.resolve({
        ok: false
      });

      await expect(googleAPI.appendNote(mockNote)).rejects.toThrow('Failed to append note to document');
    });
  });

  describe('searchNotes', () => {
    beforeEach(() => {
      googleAPI.notesDocId = 'test-doc-id';
    });

    it('should return matching notes', async () => {
      global.fetch = () => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          body: {
            content: [
              {
                paragraph: {
                  elements: [
                    {
                      textRun: {
                        content: ' Note (Test)\n─────\nTest note\n\n Source: https://example.com\n Saved: 2025-01-01\n─────'
                      }
                    }
                  ]
                }
              }
            ]
          }
        })
      });

      const results = await googleAPI.searchNotes('Test note');

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        category: 'Test',
        text: 'Test note',
        url: 'https://example.com'
      });
    });

    it('should return empty array when no matches found', async () => {
      global.fetch = () => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ body: { content: [] } })
      });

      const results = await googleAPI.searchNotes('nonexistent');

      expect(results).toHaveLength(0);
    });
  });
});
