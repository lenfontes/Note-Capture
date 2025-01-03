import googleAPI from './google-api';

// Create context menu items
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Creating context menu items');
  
  // Load saved categories or use defaults
  const { categories = ['Notes', 'Quote', 'Definition', 'Research', 'Reference'] } = 
    await chrome.storage.local.get('categories');
  
  createContextMenuItems(categories);
});

// Function to create context menu items
function createContextMenuItems(categories) {
  // Clear existing menu items
  chrome.contextMenus.removeAll();
  
  // Create parent menu
  chrome.contextMenus.create({
    id: 'saveNoteParent',
    title: 'Save to NoteCapture',
    contexts: ['selection']
  });

  // Create category submenus
  categories.forEach(category => {
    chrome.contextMenus.create({
      id: `saveNote_${category}`,
      parentId: 'saveNoteParent',
      title: category,
      contexts: ['selection']
    });
  });
}

// Listen for messages from popup to update categories
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateCategories' && Array.isArray(message.categories)) {
    console.log('Updating context menu categories:', message.categories);
    createContextMenuItems(message.categories);
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);
  if (info.menuItemId.startsWith('saveNote_')) {
    try {
      console.log('Starting save process...');
      
      // Get category from menu item ID
      const category = info.menuItemId.split('_')[1];
      console.log('Selected category:', category);
      
      // Authenticate if needed
      console.log('Authenticating...');
      if (!await googleAPI.authenticate()) {
        throw new Error('Authentication failed');
      }
      console.log('Authentication successful');

      // Get or create notes document
      console.log('Getting/creating document...');
      let { notesDocId } = await chrome.storage.local.get('notesDocId');
      console.log('Existing notesDocId:', notesDocId);
      
      if (!notesDocId) {
        console.log('Creating new document...');
        notesDocId = await googleAPI.createNotesDocument();
        console.log('Created document with ID:', notesDocId);
      }
      googleAPI.notesDocId = notesDocId;

      await saveHighlightedText(info, tab, category);

      console.log('Note saved successfully');
      
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

async function saveHighlightedText(info, tab, category) {
  try {
    const { notes = [] } = await chrome.storage.local.get('notes');
    const note = {
      text: info.selectionText,
      source: tab.url,
      sourceText: tab.url ? new URL(tab.url).hostname : 'Unknown',
      category,
      timestamp: new Date().toISOString()
    };
    
    // Save to Google Docs
    const { notesDocId } = await chrome.storage.local.get('notesDocId');
    if (notesDocId) {
      await googleAPI.appendToDoc(note);  // Pass the note object directly
    }

    // Save locally
    notes.unshift(note);
    await chrome.storage.local.set({ notes });
  } catch (error) {
    console.error('Error saving note:', error);
    throw error;  // Re-throw to handle in parent
  }
}
