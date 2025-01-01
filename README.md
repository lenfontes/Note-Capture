# NoteCapture Chrome Extension

A powerful Chrome extension that allows you to save and organize highlighted text with Google Docs integration. Perfect for research, study notes, or collecting interesting content while browsing.

## Features

- **Note Capture**
  - Save highlighted text from any webpage with right-click
  - Automatically preserves source URL and timestamp
  - Rich text formatting support

- **Organization**
  - Customizable categories for better note organization
  - Drag-and-drop category reordering
  - Quick category filtering
  - Date-based filtering (Today, Last 7 Days, Last 30 Days, All Time)

- **Google Docs Integration**
  - Seamless sync with Google Docs
  - Automatic document creation and organization
  - Categories and metadata preserved in Google Docs
  - Changes sync both ways

- **User Interface**
  - Modern, clean interface
  - Swipe-to-delete on touch devices
  - Delete button on desktop
  - Interactive tutorial for new users
  - Status notifications for actions
  - Responsive design that works on any screen size

- **Search & Filter**
  - Full-text search through notes
  - Filter by category
  - Date range filtering
  - Source URL filtering

## Installation

1. Clone this repository or download the ZIP file
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Setup

1. Create a Google Cloud Project and enable the Google Docs API
2. Create OAuth 2.0 credentials and replace the `${CLIENT_ID}` in manifest.json with your client ID
3. Install the extension in Chrome
4. On first launch, authorize the extension to access Google Docs

## Usage

### Saving Notes
1. Highlight any text on a webpage
2. Right-click and select "Save to NoteCapture"
3. The note is automatically saved with source URL and timestamp
4. Choose a category for better organization

### Managing Notes
1. Click the extension icon to open the notes panel
2. View all notes organized by category
3. Use the date filter to find recent notes
4. Search through notes using the search bar
5. Delete notes by:
   - Swiping left on touch devices
   - Clicking the delete button on desktop

### Categories
1. Click the "Categories" tab to manage categories
2. Add new categories with the "+" button
3. Drag to reorder categories
4. Remove categories (notes will be marked as "Uncategorized")

### Google Docs Sync
- Notes are automatically synced to a dedicated Google Doc
- Each note includes:
  - The captured text
  - Source URL
  - Timestamp
  - Category
- Changes made in the extension sync to Google Docs
- Deleting notes or categories updates both places

## Development

### Project Structure

```
notecapture/
├── src/                # Source files
│   ├── manifest.json   # Extension configuration
│   └── ...            # Other source files
├── extension-dist/     # Built extension files
│   ├── popup.html     # Main extension interface
│   ├── popup.js       # Popup functionality
│   ├── background.js  # Background service worker
│   └── styles.css     # Styling
├── webpack.config.js  # Build configuration
└── README.md         # Documentation
```

### Requirements

- Chrome Browser
- Google Cloud Project with Docs API enabled
- OAuth 2.0 credentials
- Node.js and npm for development

### Building

```bash
npm install    # Install dependencies
npm run build  # Build the extension
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Privacy

We take your privacy seriously. Please read our [Privacy Policy](PRIVACY.md) to understand how we handle your data.
