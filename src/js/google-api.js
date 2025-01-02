class GoogleAPIClient {
  constructor() {
    this.token = null;
    this.notesDocId = null;
  }

  async authenticate() {
    try {
      this.token = await this.getAuthToken();
      return true;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  async getAuthToken() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });
  }

  async createNotesDocument() {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'NoteCapture Notes'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create document: ${response.statusText}`);
    }

    const data = await response.json();
    this.notesDocId = data.documentId;
    await chrome.storage.local.set({ notesDocId: this.notesDocId });
    return this.notesDocId;
  }

  async appendNote(text, url, category) {
    if (!this.token || !this.notesDocId) {
      throw new Error('Not authenticated or no document ID');
    }

    const requests = [{
      insertText: {
        location: {
          index: 1
        },
        text: `${text}\n\nSource: ${url}\nCategory: ${category}\n\n---\n\n`
      }
    }];

    const response = await fetch(`https://docs.googleapis.com/v1/documents/${this.notesDocId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: requests
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to append note: ${response.statusText}`);
    }

    return response.json();
  }
}

export default new GoogleAPIClient();
