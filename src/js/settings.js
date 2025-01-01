document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const syncOption = document.getElementById('syncOption');
  const autoSync = document.getElementById('autoSync');
  const linkDisplay = document.getElementById('linkDisplay');
  const categoriesList = document.getElementById('categoriesList');
  const newCategory = document.getElementById('newCategory');
  const addCategory = document.getElementById('addCategory');
  const signOut = document.getElementById('signOut');
  const saveSettings = document.getElementById('saveSettings');

  // Load current settings
  loadSettings();

  // Event listeners
  addCategory.addEventListener('click', handleAddCategory);
  signOut.addEventListener('click', handleSignOut);
  saveSettings.addEventListener('click', handleSaveSettings);

  async function loadSettings() {
    try {
      const data = await chrome.storage.sync.get(['settings', 'categories']);
      const settings = data.settings || {};
      const categories = data.categories || [];

      // Apply settings to form
      syncOption.value = settings.syncOption || 'docs';
      autoSync.checked = settings.autoSync !== false;
      linkDisplay.value = settings.linkDisplay || 'footnote';

      // Display categories
      displayCategories(categories);
    } catch (error) {
      console.error('Error loading settings:', error);
      alert('Failed to load settings. Please try refreshing the page.');
    }
  }

  function displayCategories(categories) {
    categoriesList.innerHTML = categories.map(category => `
      <div class="category-item">
        <span>${category}</span>
        ${category !== 'Uncategorized' ? 
          `<button class="delete-category" data-category="${category}">×</button>` 
          : ''}
      </div>
    `).join('');

    // Add delete event listeners
    document.querySelectorAll('.delete-category').forEach(button => {
      button.addEventListener('click', () => handleDeleteCategory(button.dataset.category));
    });
  }

  async function handleAddCategory() {
    const categoryName = newCategory.value.trim();
    if (!categoryName) return;

    try {
      const data = await chrome.storage.sync.get(['categories']);
      const categories = data.categories || [];

      if (!categories.includes(categoryName)) {
        categories.push(categoryName);
        await chrome.storage.sync.set({ categories });
        displayCategories(categories);
        newCategory.value = '';
      }
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to add category. Please try again.');
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
      alert('Failed to delete category. Please try again.');
    }
  }

  async function handleSignOut() {
    try {
      await new Promise((resolve, reject) => {
        chrome.identity.clearAllCachedAuthTokens(() => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
      
      // Clear stored data
      await chrome.storage.sync.clear();
      
      // Redirect to onboarding
      chrome.tabs.create({ url: 'onboarding.html' });
      window.close();
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    }
  }

  async function handleSaveSettings() {
    try {
      const settings = {
        syncOption: syncOption.value,
        autoSync: autoSync.checked,
        linkDisplay: linkDisplay.value
      };

      await chrome.storage.sync.set({ settings });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  }
});
