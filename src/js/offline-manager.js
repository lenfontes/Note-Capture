export class OfflineManager {
  constructor() {
    this.SYNC_QUEUE_KEY = 'noteCapture_syncQueue';
    this.initializeNetworkListener();
  }

  initializeNetworkListener() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  async handleOnline() {
    try {
      const queue = await this.getSyncQueue();
      if (queue.length > 0) {
        chrome.runtime.sendMessage({
          action: 'syncNotes',
          source: 'offlineManager'
        });
      }
    } catch (error) {
      console.error('Error handling online state:', error);
    }
  }

  handleOffline() {
    chrome.runtime.sendMessage({
      action: 'updateStatus',
      status: 'offline'
    });
  }

  async addToSyncQueue(note) {
    try {
      const queue = await this.getSyncQueue();
      queue.push({
        note,
        timestamp: new Date().toISOString(),
        retryCount: 0
      });
      await chrome.storage.local.set({ [this.SYNC_QUEUE_KEY]: queue });
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      throw error;
    }
  }

  async getSyncQueue() {
    try {
      const data = await chrome.storage.local.get([this.SYNC_QUEUE_KEY]);
      return data[this.SYNC_QUEUE_KEY] || [];
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  }

  async removeFromSyncQueue(noteId) {
    try {
      const queue = await this.getSyncQueue();
      const updatedQueue = queue.filter(item => item.note.id !== noteId);
      await chrome.storage.local.set({ [this.SYNC_QUEUE_KEY]: updatedQueue });
    } catch (error) {
      console.error('Error removing from sync queue:', error);
      throw error;
    }
  }

  async processSyncQueue() {
    try {
      const queue = await this.getSyncQueue();
      if (queue.length === 0) return;

      const googleAPI = new GoogleAPIClient();
      await googleAPI.initialize();

      for (const item of queue) {
        try {
          await googleAPI.appendNote(item.note);
          await this.removeFromSyncQueue(item.note.id);
        } catch (error) {
          console.error('Error processing queue item:', error);
          item.retryCount = (item.retryCount || 0) + 1;
          if (item.retryCount >= 3) {
            await this.removeFromSyncQueue(item.note.id);
          }
        }
      }

      // Update the queue with any failed items
      const updatedQueue = await this.getSyncQueue();
      await chrome.storage.local.set({ [this.SYNC_QUEUE_KEY]: updatedQueue });
    } catch (error) {
      console.error('Error processing sync queue:', error);
      throw error;
    }
  }
}
