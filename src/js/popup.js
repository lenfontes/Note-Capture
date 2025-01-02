import googleAPI from './google-api';

class PopupManager {
  constructor() {
    this.currentFilter = 'All';
    this.currentTimeFilter = 'All Time';
    this.notes = [];
    this.categories = [];
    this.hasUnsavedChanges = false;
    this.dragSource = null;
    this.customDateRange = null;
    
    this.initializeEventListeners();
    this.loadData();
  }

  initializeEventListeners() {
    // Main tabs
    document.querySelectorAll('.main-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchMainTab(tab));
    });

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchFilter(tab));
    });

    // Time filter
    const timeSelect = document.getElementById('time-select');
    const customDateDiv = document.getElementById('custom-date');
    const startDatePicker = document.getElementById('date-picker-start');
    const endDatePicker = document.getElementById('date-picker-end');
    const applyDateBtn = document.getElementById('apply-date');

    timeSelect.addEventListener('change', (event) => {
      if (event.target.value === 'Custom') {
        customDateDiv.style.display = 'flex';
        const today = new Date().toISOString().split('T')[0];
        startDatePicker.value = today;
        endDatePicker.value = today;
      } else {
        customDateDiv.style.display = 'none';
        this.currentTimeFilter = event.target.value;
        this.customDateRange = null;
        this.displayNotes();
      }
    });

    applyDateBtn.addEventListener('click', () => {
      const startDate = startDatePicker.value;
      const endDate = endDatePicker.value;
      if (startDate && endDate) {
        this.currentTimeFilter = 'Custom';
        // Set start date to beginning of day in local timezone
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        // Set end date to end of day in local timezone
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        this.customDateRange = { start, end };
        this.displayNotes();
      }
    });

    // Clear all notes
    document.getElementById('clear-all').addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all notes? This will delete all notes from both local storage and Google Docs.')) {
        try {
          const { notesDocId } = await chrome.storage.local.get('notesDocId');
          if (!notesDocId) {
            throw new Error('No Google Doc found');
          }

          // Clear Google Doc
          await googleAPI.clearDocument();

          // Clear local storage
          await chrome.storage.local.set({ notes: [] });
          this.notes = [];
          
          // Update UI
          this.displayNotes();
          this.updateFilterCounts();

          alert('All notes have been cleared successfully!');
        } catch (error) {
          console.error('Error clearing notes:', error);
          alert('Failed to clear notes: ' + error.message);
        }
      }
    });

    // Open in Google Docs
    document.getElementById('open-docs').addEventListener('click', () => this.openInGoogleDocs());

    // Categories management
    document.getElementById('add-category').addEventListener('click', () => this.addCategory());
    document.getElementById('save-categories').addEventListener('click', () => this.saveCategories());

    // Handle drag and drop events on the categories list
    const categoriesList = document.getElementById('categories-list');
    categoriesList.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingItem = categoriesList.querySelector('.dragging');
      const siblings = [...categoriesList.querySelectorAll('.category-item:not(.dragging)')];
      const nextSibling = siblings.find(sibling => {
        const box = sibling.getBoundingClientRect();
        const offset = e.clientY - box.top - box.height / 2;
        return offset < 0;
      });
      
      if (nextSibling) {
        categoriesList.insertBefore(draggingItem, nextSibling);
      } else {
        categoriesList.appendChild(draggingItem);
      }
    });
  }

  async loadData() {
    try {
      // Load categories
      const { categories = ['Notes', 'Quote', 'Definition', 'Research', 'Reference'] } = 
        await chrome.storage.local.get('categories');
      this.categories = categories;
      this.displayCategories();

      // Load notes
      const { notesDocId } = await chrome.storage.local.get('notesDocId');
      if (!notesDocId) {
        this.displayEmptyState();
        return;
      }

      const { notes = [] } = await chrome.storage.local.get('notes');
      this.notes = notes;
      this.updateFilterCounts();
      this.displayNotes();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  switchMainTab(tab) {
    const tabName = tab.dataset.tab;
    document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    
    tab.classList.add('active');
    document.getElementById(`${tabName}-content`).classList.add('active');
  }

  switchFilter(tab) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    this.currentFilter = tab.textContent.split(' ')[0];
    this.displayNotes();
  }

  updateFilterCounts() {
    const filteredNotes = this.filterNotesByTime(this.notes);
    const counts = {
      All: filteredNotes.length,
      Notes: filteredNotes.filter(n => n.category === 'Notes').length,
      Quote: filteredNotes.filter(n => n.category === 'Quote').length,
      Definition: filteredNotes.filter(n => n.category === 'Definition').length,
      Research: filteredNotes.filter(n => n.category === 'Research').length,
      Reference: filteredNotes.filter(n => n.category === 'Reference').length
    };

    document.querySelectorAll('.filter-tab').forEach(tab => {
      const category = tab.textContent.split(' ')[0];
      tab.textContent = `${category} (${counts[category] || 0})`;
    });
  }

  filterNotesByTime(notes) {
    if (!notes) return [];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    return notes.filter(note => {
      const noteDate = new Date(note.timestamp);
      
      switch (this.currentTimeFilter) {
        case 'Today':
          return noteDate >= today;
        case 'Yesterday':
          return noteDate >= yesterday && noteDate < today;
        case 'Last Week':
          return noteDate >= lastWeek && noteDate < yesterday;
        case 'Last Month':
          return noteDate >= lastMonth && noteDate < lastWeek;
        case 'Custom':
          if (this.customDateRange) {
            return noteDate >= this.customDateRange.start && noteDate <= this.customDateRange.end;
          }
          return true;
        default:
          return true;
      }
    });
  }

  displayNotes() {
    const notesList = document.getElementById('notes-list');
    notesList.innerHTML = '';

    // First filter by time
    let filteredNotes = this.filterNotesByTime(this.notes);

    // Then filter by category
    if (this.currentFilter !== 'All') {
      filteredNotes = filteredNotes.filter(note => note.category === this.currentFilter);
    }

    if (filteredNotes.length === 0) {
      this.displayEmptyState();
      return;
    }

    filteredNotes.forEach(note => {
      const noteElement = this.createNoteElement(note);
      notesList.appendChild(noteElement);
    });
  }

  displayCategories() {
    const list = document.getElementById('categories-list');
    list.innerHTML = '';

    this.categories.forEach((category, index) => {
      const item = document.createElement('div');
      item.className = 'category-item';
      item.draggable = true;
      item.innerHTML = `
        <span class="category-drag">...</span>
        <span class="category-name">${category}</span>
        <button class="remove-category">Remove</button>
      `;

      // Add drag and drop event listeners
      item.addEventListener('dragstart', () => {
        item.classList.add('dragging');
        this.dragSource = index;
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        // Update categories array based on new DOM order
        const items = [...list.querySelectorAll('.category-item')];
        this.categories = items.map(item => 
          item.querySelector('.category-name').textContent
        );
        this.hasUnsavedChanges = true;
      });

      // Add remove event listener
      item.querySelector('.remove-category').addEventListener('click', () => {
        this.removeCategory(index);
      });

      list.appendChild(item);
    });
  }

  addCategory() {
    const input = document.getElementById('new-category');
    const category = input.value.trim();
    
    if (category && !this.categories.includes(category)) {
      this.categories.push(category);
      this.hasUnsavedChanges = true;
      this.displayCategories();
      input.value = '';
    }
  }

  removeCategory(index) {
    this.categories.splice(index, 1);
    this.hasUnsavedChanges = true;
    this.displayCategories();
  }

  async saveCategories() {
    try {
      await chrome.storage.local.set({ categories: this.categories });
      this.hasUnsavedChanges = false;
      
      // Update context menus
      chrome.runtime.sendMessage({ 
        action: 'updateCategories', 
        categories: this.categories 
      });
      
      // Show success message
      const saveBtn = document.getElementById('save-categories');
      const originalText = saveBtn.textContent;
      saveBtn.textContent = 'Saved!';
      setTimeout(() => {
        saveBtn.textContent = originalText;
      }, 2000);
    } catch (error) {
      console.error('Error saving categories:', error);
    }
  }

  createNoteElement(note) {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note-item';
    
    const content = document.createElement('div');
    content.className = 'note-content';
    content.textContent = note.text;
    
    const meta = document.createElement('div');
    meta.className = 'note-meta';
    
    const source = document.createElement('div');
    source.className = 'note-source';
    
    // Safely handle URL display
    let displayUrl = '';
    try {
      const url = new URL(note.source);
      displayUrl = url.hostname;
    } catch (e) {
      displayUrl = note.source;
    }
    
    source.innerHTML = `
      <div class="source-line">
        <span class="source-label">From:</span> 
        <a href="${note.source}" target="_blank">${note.sourceText || displayUrl}</a>
      </div>
      <div class="capture-line">
        <span class="capture-label">Saved:</span> ${new Date(note.timestamp).toLocaleString()}
      </div>
    `;
    
    const actions = document.createElement('div');
    actions.className = 'note-actions';
    
    const category = document.createElement('div');
    category.className = 'note-category';
    category.textContent = note.category;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-note';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = async () => {
      if (confirm('Are you sure you want to delete this note?')) {
        try {
          const success = await this.deleteNote(note);
          if (success) {
            noteDiv.remove();
            this.updateFilterCounts();
          } else {
            alert('Failed to delete note. Please try again.');
          }
        } catch (error) {
          console.error('Error deleting note:', error);
          alert('Failed to delete note: ' + error.message);
        }
      }
    };
    
    actions.appendChild(category);
    actions.appendChild(deleteBtn);
    
    meta.appendChild(source);
    meta.appendChild(actions);
    
    noteDiv.appendChild(content);
    noteDiv.appendChild(meta);
    
    return noteDiv;
  }

  async deleteNote(note) {
    try {
      // Get current notes
      const { notes = [] } = await chrome.storage.local.get('notes');
      
      // Find note index
      const index = notes.findIndex(n => 
        n.text === note.text && 
        n.source === note.source && 
        n.timestamp === note.timestamp &&
        n.category === note.category
      );
      
      if (index === -1) {
        throw new Error('Note not found in storage');
      }

      // Get Google Docs ID first
      const { notesDocId } = await chrome.storage.local.get('notesDocId');
      if (!notesDocId) {
        throw new Error('No Google Doc found. Please open Google Docs first.');
      }

      // Remove from local storage first (we can always add it back if Google Docs fails)
      const deletedNote = notes.splice(index, 1)[0];
      await chrome.storage.local.set({ notes });
      this.notes = notes; // Update the local notes array

      // Try to delete from Google Docs
      try {
        await googleAPI.deleteNoteFromDoc(notesDocId, deletedNote);
        return true;
      } catch (error) {
        // If Google Docs deletion fails, add the note back to local storage
        notes.splice(index, 0, deletedNote);
        await chrome.storage.local.set({ notes });
        this.notes = notes;
        throw error;
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  displayEmptyState() {
    const notesList = document.getElementById('notes-list');
    notesList.innerHTML = '<div class="empty-state">No notes found</div>';
  }

  async openInGoogleDocs() {
    try {
      const { notesDocId } = await chrome.storage.local.get('notesDocId');
      if (notesDocId) {
        const url = `https://docs.google.com/document/d/${notesDocId}/edit`;
        chrome.tabs.create({ url });
      }
    } catch (error) {
      console.error('Error opening Google Doc:', error);
    }
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
