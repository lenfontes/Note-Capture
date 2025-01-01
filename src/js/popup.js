const googleAPI = new GoogleAPIClient();

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize UI elements
  const searchInput = document.getElementById('searchInput');
  const categoriesList = document.getElementById('categoriesList');
  const notesList = document.getElementById('notesList');
  const addCategoryBtn = document.getElementById('addCategory');
  const settingsBtn = document.getElementById('settingsBtn');
  const syncBtn = document.getElementById('syncBtn');
  const lastNoteElement = document.getElementById('lastNote');

  try {
    await googleAPI.initialize();
    // Load and display notes
    await loadNotes();
    // Load and display categories
    await loadCategories();
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    showError('Failed to initialize. Please check your Google account connection.');
  }

  // Display the last captured note when popup opens
  chrome.storage.local.get(['lastNote'], (result) => {
    if (result.lastNote) {
      const { text, url, timestamp } = result.lastNote;
      const date = new Date(timestamp).toLocaleString();
      lastNoteElement.innerHTML = `
        <p><strong>Text:</strong> ${text}</p>
        <p><strong>From:</strong> <a href="${url}" target="_blank">${url}</a></p>
        <p><strong>Captured:</strong> ${date}</p>
      `;
    } else {
      lastNoteElement.textContent = 'No notes captured yet. Highlight some text and right-click to save!';
    }
  });

  // Event listeners
  searchInput.addEventListener('input', handleSearch);
  addCategoryBtn.addEventListener('click', handleAddCategory);
  settingsBtn.addEventListener('click', openSettings);
  syncBtn.addEventListener('click', handleSync);
});

async function loadNotes(searchQuery = '') {
  try {
    const notes = await googleAPI.searchNotes(searchQuery);
    displayNotes(notes);
  } catch (error) {
    console.error('Error loading notes:', error);
    showError('Failed to load notes. Please try again.');
  }
}

async function loadCategories() {
  try {
    const data = await chrome.storage.sync.get(['categories']);
    const categories = data.categories || ['Uncategorized'];
    displayCategories(categories);
  } catch (error) {
    console.error('Error loading categories:', error);
    showError('Failed to load categories.');
  }
}

function displayNotes(notes) {
  const notesList = document.getElementById('notesList');
  if (notes.length === 0) {
    notesList.innerHTML = '<div class="no-notes">No notes found</div>';
    return;
  }

  notesList.innerHTML = notes.map(note => `
    <div class="note">
      <div class="note-text">${note.text.substring(0, 100)}${note.text.length > 100 ? '...' : ''}</div>
      <div class="note-meta">
        <span class="note-category">${note.category}</span>
        <a href="${note.url}" target="_blank" class="note-link">Source</a>
        <span class="note-date">${new Date(note.timestamp).toLocaleDateString()}</span>
      </div>
    </div>
  `).join('');
}

function displayCategories(categories) {
  const categoriesList = document.getElementById('categoriesList');
  categoriesList.innerHTML = categories.map(category => `
    <div class="category">
      <span>${category}</span>
      ${category !== 'Uncategorized' ? '<button class="delete-category">×</button>' : ''}
    </div>
  `).join('');

  // Add delete event listeners
  document.querySelectorAll('.delete-category').forEach(button => {
    button.addEventListener('click', () => handleDeleteCategory(button.parentElement.querySelector('span').textContent));
  });
}

async function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase();
  await loadNotes(searchTerm);
}

async function handleAddCategory() {
  const category = prompt('Enter new category name:');
  if (category) {
    try {
      const data = await chrome.storage.sync.get(['categories']);
      const categories = data.categories || ['Uncategorized'];
      if (!categories.includes(category)) {
        categories.push(category);
        await chrome.storage.sync.set({ categories });
        displayCategories(categories);
      }
    } catch (error) {
      console.error('Error adding category:', error);
      showError('Failed to add category.');
    }
  }
}

async function handleDeleteCategory(category) {
  try {
    const data = await chrome.storage.sync.get(['categories']);
    const categories = data.categories || [];
    const newCategories = categories.filter(c => c !== category);
    
    await chrome.storage.sync.set({ categories: newCategories });
    displayCategories(newCategories);
  } catch (error) {
    console.error('Error deleting category:', error);
    showError('Failed to delete category.');
  }
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

async function handleSync() {
  try {
    const syncBtn = document.getElementById('syncBtn');
    syncBtn.disabled = true;
    syncBtn.textContent = 'Syncing...';

    const response = await chrome.runtime.sendMessage({ action: 'syncNotes' });
    
    if (response.success) {
      syncBtn.textContent = 'Synced ✓';
      setTimeout(() => {
        syncBtn.disabled = false;
        syncBtn.textContent = 'Sync Now';
      }, 2000);
      
      // Reload notes to show latest changes
      await loadNotes();
    } else {
      throw new Error(response.error || 'Sync failed');
    }
  } catch (error) {
    console.error('Error syncing notes:', error);
    showError('Failed to sync notes. Please try again.');
    
    const syncBtn = document.getElementById('syncBtn');
    syncBtn.disabled = false;
    syncBtn.textContent = 'Sync Now';
  }
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
}
