import googleAPI from './google-api';

// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveNote',
    title: 'Save to NoteCapture',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'saveNote') {
    try {
      // Authenticate if needed
      if (!await googleAPI.authenticate()) {
        throw new Error('Authentication failed');
      }

      // Get or create notes document
      let { notesDocId } = await chrome.storage.local.get('notesDocId');
      if (!notesDocId) {
        notesDocId = await googleAPI.createNotesDocument();
      }
      googleAPI.notesDocId = notesDocId;

      // Save the note
      const text = info.selectionText;
      const url = info.pageUrl;
      const category = 'Uncategorized'; // Default category

      await googleAPI.appendNote(text, url, category);
      
      // Notify user
      chrome.action.setBadgeText({ text: '✓' });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 2000);

    } catch (error) {
      console.error('Failed to save note:', error);
      chrome.action.setBadgeText({ text: '❌' });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 2000);
    }
  }
});
