import googleAPI from './google-api';

document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Hide all tab content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
      });
      
      // Show selected tab content
      const tabId = tab.dataset.tab + '-tab';
      document.getElementById(tabId).classList.remove('hidden');
    });
  });

  // Add category button
  document.getElementById('add-category').addEventListener('click', async () => {
    const category = prompt('Enter new category name:');
    if (category) {
      const categories = await getCategories();
      categories.push(category);
      await chrome.storage.local.set({ categories });
      await loadCategories();
    }
  });

  // Search functionality
  document.getElementById('search').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const notes = document.querySelectorAll('.note-item');
    notes.forEach(note => {
      const text = note.textContent.toLowerCase();
      note.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
  });

  // Initial load
  loadCategories();
  loadLastNote();
});

async function getCategories() {
  const { categories = ['Uncategorized'] } = await chrome.storage.local.get('categories');
  return categories;
}

async function loadCategories() {
  const categories = await getCategories();
  const list = document.getElementById('categories-list');
  list.innerHTML = '';
  
  categories.forEach(category => {
    const div = document.createElement('div');
    div.className = 'category-item';
    div.textContent = category;
    
    if (category !== 'Uncategorized') {
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '×';
      deleteBtn.className = 'delete-btn';
      deleteBtn.onclick = async () => {
        const updatedCategories = categories.filter(c => c !== category);
        await chrome.storage.local.set({ categories: updatedCategories });
        await loadCategories();
      };
      div.appendChild(deleteBtn);
    }
    
    list.appendChild(div);
  });
}

async function loadLastNote() {
  try {
    const { notesDocId } = await chrome.storage.local.get('notesDocId');
    if (notesDocId) {
      // In a real implementation, we would fetch the last note from Google Docs
      // For now, we'll just show a placeholder
      const notesList = document.getElementById('notes-list');
      notesList.innerHTML = '<div class="note-item">Loading latest notes...</div>';
    } else {
      const notesList = document.getElementById('notes-list');
      notesList.innerHTML = '<div class="note-item">No notes yet. Highlight text and right-click to save notes.</div>';
    }
  } catch (error) {
    console.error('Failed to load last note:', error);
  }
}
