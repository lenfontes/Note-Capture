import { OfflineManager } from '../js/offline-manager.js';

describe('OfflineManager', () => {
  let offlineManager;
  
  beforeEach(() => {
    offlineManager = new OfflineManager();
    chrome.storage.local.get.callsFake((key, callback) => {
      callback({});
    });
    chrome.storage.local.set.callsFake((data, callback) => {
      if (callback) callback();
    });
    chrome.runtime.sendMessage.callsFake((message, callback) => {
      if (callback) callback();
    });
  });

  describe('getSyncQueue', () => {
    it('should return empty array when no queue exists', async () => {
      chrome.storage.local.get.callsFake((key, callback) => {
        callback({});
      });

      const queue = await offlineManager.getSyncQueue();
      expect(queue).toEqual([]);
      expect(chrome.storage.local.get.calledWith(['noteCapture_syncQueue'])).toBe(true);
    });

    it('should return existing queue', async () => {
      const mockQueue = [{ note: { id: 1 }, timestamp: '2025-01-01' }];
      chrome.storage.local.get.callsFake((key, callback) => {
        callback({ noteCapture_syncQueue: mockQueue });
      });
      
      const queue = await offlineManager.getSyncQueue();
      expect(queue).toEqual(mockQueue);
      expect(chrome.storage.local.get.calledWith(['noteCapture_syncQueue'])).toBe(true);
    });
  });

  describe('addToSyncQueue', () => {
    it('should add note to empty queue', async () => {
      const mockNote = { id: 1, text: 'Test note' };
      let storedData = null;

      chrome.storage.local.get.callsFake((key, callback) => {
        callback({});
      });

      chrome.storage.local.set.callsFake((data, callback) => {
        storedData = data;
        if (callback) callback();
      });
      
      await offlineManager.addToSyncQueue(mockNote);
      
      expect(chrome.storage.local.set.calledOnce).toBe(true);
      expect(storedData).toBeTruthy();
      expect(storedData.noteCapture_syncQueue).toHaveLength(1);
      expect(storedData.noteCapture_syncQueue[0]).toMatchObject({
        note: mockNote,
        retryCount: 0
      });
    });

    it('should append note to existing queue', async () => {
      const existingNote = { id: 1, text: 'Existing note' };
      const newNote = { id: 2, text: 'New note' };
      let storedData = null;
      
      chrome.storage.local.get.callsFake((key, callback) => {
        callback({
          noteCapture_syncQueue: [{
            note: existingNote,
            timestamp: '2025-01-01',
            retryCount: 0
          }]
        });
      });

      chrome.storage.local.set.callsFake((data, callback) => {
        storedData = data;
        if (callback) callback();
      });
      
      await offlineManager.addToSyncQueue(newNote);
      
      expect(chrome.storage.local.set.calledOnce).toBe(true);
      expect(storedData.noteCapture_syncQueue).toHaveLength(2);
      expect(storedData.noteCapture_syncQueue[1].note).toEqual(newNote);
    });
  });

  describe('handleOnline', () => {
    it('should trigger sync when queue is not empty', async () => {
      const mockQueue = [{ note: { id: 1 }, timestamp: '2025-01-01' }];
      chrome.storage.local.get.callsFake((key, callback) => {
        callback({ noteCapture_syncQueue: mockQueue });
      });
      
      await offlineManager.handleOnline();
      
      expect(chrome.runtime.sendMessage.calledWith({
        action: 'syncNotes',
        source: 'offlineManager'
      })).toBe(true);
    });

    it('should not trigger sync when queue is empty', async () => {
      chrome.storage.local.get.callsFake((key, callback) => {
        callback({});
      });
      
      await offlineManager.handleOnline();
      
      expect(chrome.runtime.sendMessage.called).toBe(false);
    });
  });

  describe('handleOffline', () => {
    it('should send offline status message', () => {
      offlineManager.handleOffline();
      
      expect(chrome.runtime.sendMessage.calledWith({
        action: 'updateStatus',
        status: 'offline'
      })).toBe(true);
    });
  });

  describe('processSyncQueue', () => {
    it('should process all items in queue and remove successful ones', async () => {
      const mockQueue = [
        { note: { id: 1 }, timestamp: '2025-01-01', retryCount: 0 },
        { note: { id: 2 }, timestamp: '2025-01-01', retryCount: 0 }
      ];

      let storedData = null;

      chrome.storage.local.get.callsFake((key, callback) => {
        callback({ noteCapture_syncQueue: mockQueue });
      });

      chrome.storage.local.set.callsFake((data, callback) => {
        storedData = data;
        if (callback) callback();
      });

      const mockGoogleAPI = {
        initialize: () => Promise.resolve(true),
        appendNote: () => Promise.resolve(true)
      };

      global.GoogleAPIClient = function() {
        return mockGoogleAPI;
      };

      await offlineManager.processSyncQueue();

      expect(storedData).toBeTruthy();
      expect(storedData.noteCapture_syncQueue).toEqual([]);
    });

    it('should increment retry count for failed items', async () => {
      const mockQueue = [
        { note: { id: 1 }, timestamp: '2025-01-01', retryCount: 0 }
      ];

      let storedData = null;

      chrome.storage.local.get.callsFake((key, callback) => {
        callback({ noteCapture_syncQueue: mockQueue });
      });

      chrome.storage.local.set.callsFake((data, callback) => {
        storedData = data;
        if (callback) callback();
      });

      const mockGoogleAPI = {
        initialize: () => Promise.resolve(true),
        appendNote: () => Promise.reject(new Error('API Error'))
      };

      global.GoogleAPIClient = function() {
        return mockGoogleAPI;
      };

      await offlineManager.processSyncQueue();

      expect(storedData.noteCapture_syncQueue[0].retryCount).toBe(1);
    });
  });
});
