document.addEventListener('DOMContentLoaded', () => {
  const syncOptions = document.querySelectorAll('.sync-option');
  const signInButton = document.getElementById('signInButton');
  const finishButton = document.getElementById('finishButton');
  let selectedSync = null;

  // Handle sync option selection
  syncOptions.forEach(option => {
    option.addEventListener('click', () => {
      syncOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      selectedSync = option.dataset.option;
      updateFinishButton();
    });
  });

  // Handle Google Sign-in
  signInButton.addEventListener('click', async () => {
    try {
      const token = await authenticate();
      if (token) {
        signInButton.textContent = 'Signed In ✓';
        signInButton.disabled = true;
        updateFinishButton();
      }
    } catch (error) {
      console.error('Authentication error:', error);
      alert('Failed to sign in. Please try again.');
    }
  });

  // Handle finish setup
  finishButton.addEventListener('click', async () => {
    try {
      await saveSettings();
      chrome.storage.sync.set({
        'onboardingComplete': true,
        'syncOption': selectedSync
      }, () => {
        window.close();
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error completing setup. Please try again.');
    }
  });

  async function authenticate() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, function(token) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });
  }

  async function saveSettings() {
    // Initialize default categories
    const defaultCategories = ['Uncategorized', 'Work', 'Personal', 'Research'];
    await chrome.storage.sync.set({ 
      categories: defaultCategories,
      settings: {
        syncOption: selectedSync,
        linkDisplay: 'footnote',
        autoSync: true
      }
    });
  }

  function updateFinishButton() {
    const isSignedIn = signInButton.disabled;
    const hasSyncOption = selectedSync !== null;
    finishButton.disabled = !(isSignedIn && hasSyncOption);
  }
});
