// Import dependencies
import { GoogleAPIClient } from './google-api.js';
import { OfflineManager } from './offline-manager.js';

// Initialize Google API client and Offline Manager
const googleAPI = new GoogleAPIClient();
const offlineManager = new OfflineManager();

// Initialize context menu
chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: "saveNote",
    title: "Save to NoteCapture",
    contexts: ["selection"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveNote") {
    saveNote(info.selectionText, tab.url);
  }
});

// Save note function
async function saveNote(text, url) {
  try {
    const timestamp = new Date().toISOString();
    const note = {
      text: text,
      url: url,
      timestamp: timestamp,
      category: 'General' // Default category
    };

    // Try to save directly, if offline it will be queued
    try {
      await googleAPI.appendNote(note);
      chrome.runtime.sendMessage({
        action: 'updateStatus',
        status: 'Note saved successfully'
      });
    } catch (error) {
      console.error('Failed to save note:', error);
      // If we're offline or there's an error, add to sync queue
      await offlineManager.addToSyncQueue(note);
      chrome.runtime.sendMessage({
        action: 'updateStatus',
        status: 'Note saved for later sync'
      });
    }
  } catch (error) {
    console.error('Error in saveNote:', error);
    chrome.runtime.sendMessage({
      action: 'updateStatus',
      status: 'Failed to save note'
    });
  }
}

// Function to sync with Google Docs
async function syncWithGoogle() {
  try {
    await offlineManager.processSyncQueue();
  } catch (error) {
    console.error('Error syncing with Google Docs:', error);
  }
}

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Show onboarding page
    chrome.tabs.create({
      url: "onboarding.html"
    });
  }
});

// Listen for sync requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'syncNotes') {
    handleSync();
  }
});

// Handle sync process
async function handleSync() {
  try {
    await syncWithGoogle();
    chrome.runtime.sendMessage({
      action: 'updateStatus',
      status: 'Sync completed'
    });
  } catch (error) {
    console.error('Sync failed:', error);
    chrome.runtime.sendMessage({
      action: 'updateStatus',
      status: 'Sync failed'
    });
  }
}
