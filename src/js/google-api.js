export class GoogleAPIClient {
  constructor() {
    this.notesDocId = null;
    this.NOTES_DOC_ID_KEY = 'notesDocId';
    this.DOCS_API = 'https://docs.googleapis.com/v1/documents';
    this.DRIVE_API = 'https://www.googleapis.com/drive/v3';
  }

  async initialize() {
    try {
      // Get the notes doc ID from storage
      const data = await chrome.storage.sync.get([this.NOTES_DOC_ID_KEY]);
      this.notesDocId = data[this.NOTES_DOC_ID_KEY];

      if (!this.notesDocId) {
        // Create a new document if none exists
        this.notesDocId = await this.createNotesDocument();
        await chrome.storage.sync.set({ [this.NOTES_DOC_ID_KEY]: this.notesDocId });
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize GoogleAPIClient:', error);
      throw error;
    }
  }

  async getAuthToken() {
    try {
      return await chrome.identity.getAuthToken({ interactive: true });
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw error;
    }
  }

  async createNotesDocument() {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${this.DOCS_API}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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
      return data.documentId;
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  async appendNote(note) {
    if (!this.notesDocId) {
      throw new Error('Google API client not initialized');
    }

    try {
      const token = await this.getAuthToken();
      
      const requests = [{
        insertText: {
          location: { index: 1 },
          text: `\n\n${note.timestamp}\nFrom: ${note.url}\n${note.text}\n---`
        }
      }];

      const response = await fetch(`${this.DOCS_API}/${this.notesDocId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: requests
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to append note: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error appending note:', error);
      throw error;
    }
  }

  async searchNotes(query) {
    if (!this.notesDocId) {
      throw new Error('Google API client not initialized');
    }

    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.DOCS_API}/${this.notesDocId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }

      const data = await response.json();
      return this.parseNotesFromDocument(data, query);
    } catch (error) {
      console.error('Error searching notes:', error);
      throw error;
    }
  }

  parseNotesFromDocument(doc, query) {
    const notes = [];
    const content = doc.body.content || [];
    let currentNote = null;

    for (const element of content) {
      if (!element.paragraph || !element.paragraph.elements) continue;

      const text = element.paragraph.elements
        .map(e => e.textRun?.content || '')
        .join('');

      if (text.startsWith('\n\n')) {
        if (currentNote) {
          notes.push(currentNote);
        }
        currentNote = this.parseNoteFromText(text);
      } else if (currentNote) {
        currentNote.text += text;
      }
    }

    if (currentNote) {
      notes.push(currentNote);
    }

    return notes.filter(note => 
      !query || 
      note.text.toLowerCase().includes(query.toLowerCase()) ||
      note.category.toLowerCase().includes(query.toLowerCase())
    );
  }

  parseNoteFromText(text) {
    const timestampMatch = text.match(/\n\n(.*?)\n/);
    const urlMatch = text.match(/From: (.*?)\n/);

    return {
      category: 'Uncategorized',
      text: text.split('\n---')[0]?.split('\nFrom: ')[1] || '',
      url: urlMatch ? urlMatch[1] : '',
      timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString()
    };
  }

  async syncNotes(localNotes) {
    try {
      // Get all notes from Google Docs
      const remoteNotes = await this.searchNotes('');
      
      // Create a map of existing notes by content to avoid duplicates
      const existingNotes = new Set(remoteNotes.map(note => note.text));
      
      // Append new notes that don't exist in the document
      for (const note of localNotes) {
        if (!existingNotes.has(note.text)) {
          await this.appendNote(note);
          existingNotes.add(note.text);
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to sync notes:', error);
      throw error;
    }
  }
}
