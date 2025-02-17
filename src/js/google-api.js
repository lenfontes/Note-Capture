class GoogleAPIClient {
  constructor() {
    this.token = null;
    this.notesDocId = null;
  }

  async authenticate() {
    try {
      return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
          if (chrome.runtime.lastError) {
            console.error('Auth error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            this.token = token;
            console.log('Authentication successful');
            resolve(token);
          }
        });
      });
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  async getOrCreateDoc() {
    try {
      if (!this.token) {
        await this.authenticate();
      }

      // Check for existing doc ID
      const { notesDocId } = await chrome.storage.local.get('notesDocId');
      if (notesDocId) {
        console.log('Found existing doc:', notesDocId);
        this.notesDocId = notesDocId;
        return notesDocId;
      }

      console.log('Creating new document...');
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
        const error = await response.text();
        console.error('Create doc error:', error);
        throw new Error(`Failed to create document: ${response.statusText}`);
      }

      const doc = await response.json();
      console.log('Created new doc:', doc.documentId);
      this.notesDocId = doc.documentId;
      await chrome.storage.local.set({ notesDocId: doc.documentId });
      return doc.documentId;
    } catch (error) {
      console.error('Error in getOrCreateDoc:', error);
      throw error;
    }
  }

  async appendToDoc(note) {
    try {
      if (!this.token) {
        await this.authenticate();
      }

      if (!this.notesDocId) {
        await this.getOrCreateDoc();
      }

      console.log('Appending to doc:', this.notesDocId, note);

      if (!note || !note.text || !note.category) {
        throw new Error('Invalid note data');
      }

      const category = note.category || 'Uncategorized';
      const text = note.text || '';
      const source = note.source || 'Unknown source';
      const timestamp = note.timestamp ? new Date(note.timestamp).toLocaleString() : new Date().toLocaleString();

      let currentIndex = 1; // Starting index for the document

      // Create requests array for batch update
      const requests = [];

      // Add category in blue and bold
      requests.push(
        {
          insertText: {
            location: { index: currentIndex },
            text: `[${category}]\n\n` // Properly format the category with brackets and line breaks
          }
        },
        {
          updateTextStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + category.length + 2 // Only bold the category and brackets
            },
            textStyle: {
              bold: true,
              foregroundColor: {
                color: {
                  rgbColor: {
                    blue: 1,
                    red: 0,
                    green: 0
                  }
                }
              }
            },
            fields: 'bold,foregroundColor'
          }
        }
      );
      currentIndex += category.length + 3; // Update index for the next section

      // Add note text in black
      requests.push(
        {
          insertText: {
            location: { index: currentIndex },
            text: `${text}\n\n` // Ensure note text is followed by line breaks
          }
        },
        {
          updateTextStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + text.length // Only style the text, not the newlines
            },
            textStyle: {
              bold: false, 
              foregroundColor: {
                color: {
                  rgbColor: { blue: 0, red: 0, green: 0 }
                }
              }
            },
            fields: 'bold,foregroundColor'
          }
        }
      );
      currentIndex += text.length + 2;

      // Add source with URL in grey
      requests.push(
        {
          insertText: {
            location: { index: currentIndex },
            text: `Source: ${source}\n`
          }
        },
        {
          updateTextStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + 8 + source.length // "Source: " length is 8
            },
            textStyle: {
              bold: false,
              italic: true,
              foregroundColor: {
                color: {
                  rgbColor: { blue: 0.5, red: 0.5, green: 0.5 }
                }
              },
              fontSize: {
                magnitude: 9, 
                unit: 'PT'
              },
              link: {
                url: source
              }
            },
            fields: 'bold,italic,foregroundColor,fontSize,link'
          }
        }
      );
      currentIndex += 8 + source.length + 1; // +1 for newline

      // Add captured timestamp in grey
      requests.push(
        {
          insertText: {
            location: { index: currentIndex },
            text: `Captured: ${timestamp}\n\n`
          }
        },
        {
          updateTextStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + 10 + timestamp.length // "Captured: " length is 10
            },
            textStyle: {
              bold: false,
              italic: true,
              foregroundColor: {
                color: {
                  rgbColor: { blue: 0.5, red: 0.5, green: 0.5 }
                }
              },
              fontSize: {
                magnitude: 9, 
                unit: 'PT'
              },
            },
            fields: 'bold,italic,foregroundColor,fontSize'
          }
        }
      );
      currentIndex += 10 + timestamp.length + 2;

      // Add separator
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: '-----------------------------------------------\n\n'
        }
      });

      const response = await fetch(`https://docs.googleapis.com/v1/documents/${this.notesDocId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Append error:', error);
        throw new Error(`Failed to append to document: ${response.statusText}`);
      }

      console.log('Successfully appended note');
      return await response.json();
    } catch (error) {
      console.error('Error in appendToDoc:', error);
      throw error;
    }
  }

  async deleteNoteFromDoc(docId, note) {
    try {
      if (!this.token) {
        await this.authenticate();
      }

      console.log('Deleting note from doc:', docId);
      this.notesDocId = docId;

      // Get the document content
      const response = await fetch(`https://docs.googleapis.com/v1/documents/${this.notesDocId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Get doc error:', error);
        throw new Error(`Failed to get document: ${response.statusText}`);
      }

      const doc = await response.json();
      console.log('Got document content');

      if (!doc.body || !doc.body.content) {
        throw new Error('Invalid document format');
      }

      // Find the note
      const searchResult = await this.findNoteInDocument(doc.body.content, note);
      if (!searchResult) {
        throw new Error('Note not found in document');
      }

      console.log('Found note at indices:', searchResult);

      // Delete the note
      const deleteResponse = await fetch(`https://docs.googleapis.com/v1/documents/${this.notesDocId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            deleteContentRange: {
              range: {
                startIndex: searchResult.startIndex,
                endIndex: searchResult.endIndex
              }
            }
          }]
        })
      });

      if (!deleteResponse.ok) {
        const error = await deleteResponse.text();
        console.error('Delete error:', error);
        throw new Error(`Failed to delete note: ${deleteResponse.statusText}`);
      }

      console.log('Successfully deleted note');
      return await deleteResponse.json();
    } catch (error) {
      console.error('Error in deleteNoteFromDoc:', error);
      throw error;
    }
  }

  async findNoteInDocument(content, note) {
    let documentText = '';
    let currentIndex = 0;

    for (const block of content) {
      if (block.paragraph && block.paragraph.elements) {
        for (const element of block.paragraph.elements) {
          if (element.textRun && element.textRun.content) {
            const text = element.textRun.content;
            documentText += text;
            
            const noteTextIndex = documentText.lastIndexOf(note.text);
            if (noteTextIndex !== -1) {
              const beforeNote = documentText.substring(0, noteTextIndex);
              const categoryHeader = `[${note.category}]`;
              const categoryIndex = beforeNote.lastIndexOf(categoryHeader);
              
              if (categoryIndex !== -1) {
                const afterNote = documentText.substring(noteTextIndex + note.text.length);
                const separatorIndex = afterNote.indexOf('---------------');
                
                if (separatorIndex !== -1) {
                  return {
                    startIndex: categoryIndex,
                    endIndex: noteTextIndex + note.text.length + separatorIndex + '---------------\n\n'.length
                  };
                }
              }
            }
            currentIndex += text.length;
          }
        }
      }
    }

    return null;
  }

  async clearDocument() {
    try {
      if (!this.token) {
        await this.authenticate();
      }

      // Get the document ID from storage
      const { notesDocId } = await chrome.storage.local.get('notesDocId');
      if (!notesDocId) {
        throw new Error('No document ID found in storage');
      }
      this.notesDocId = notesDocId;

      console.log('Clearing document:', this.notesDocId);

      // Get the document to find its length
      const response = await fetch(`https://docs.googleapis.com/v1/documents/${this.notesDocId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Get doc error:', error);
        throw new Error(`Failed to get document: ${response.statusText}`);
      }

      const doc = await response.json();
      
      if (!doc.body || !doc.body.content) {
        throw new Error('Invalid document format');
      }

      // Get the end index of the document, ensuring we don't include the final newline
      const endIndex = doc.body.content[doc.body.content.length - 1].endIndex || 1;
      const safeEndIndex = Math.max(1, endIndex - 1); // Subtract 1 to avoid the final newline

      // Delete all content except the first character (required by Google Docs)
      const deleteResponse = await fetch(`https://docs.googleapis.com/v1/documents/${this.notesDocId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            deleteContentRange: {
              range: {
                startIndex: 1,
                endIndex: safeEndIndex
              }
            }
          }]
        })
      });

      if (!deleteResponse.ok) {
        const error = await deleteResponse.text();
        console.error('Clear doc error:', error);
        throw new Error(`Failed to clear document: ${deleteResponse.statusText}`);
      }

      console.log('Successfully cleared document');
      return await deleteResponse.json();
    } catch (error) {
      console.error('Error in clearDocument:', error);
      throw error;
    }
  }
}

export default new GoogleAPIClient();
