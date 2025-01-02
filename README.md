# NoteCapture Chrome Extension

A powerful Chrome extension that allows you to save and organize highlighted text with Google Docs integration. Perfect for research, study notes, or collecting interesting content while browsing.

## Features

- **Quick Capture**
  - Save highlighted text from any webpage via right-click menu
  - Automatic sync with Google Docs
  - Preserves source URLs and timestamps

- **Note Formatting**
  - Categories displayed in blue and bold
  - Source URLs as clickable links
  - Timestamps and metadata in elegant grey italic
  - Clear visual hierarchy for better readability
  - Customizable link display options

- **Organization**
  - Predefined and customizable categories
  - Drag-and-drop category reordering
  - Quick category filtering
  - Enhanced date filtering:
    - Preset filters (Today, Yesterday, Last Week, Last Month)
    - Custom date range picker
    - Timezone-aware date handling

- **Google Docs Integration**
  - Seamless sync with Google Docs
  - Automatic document creation and organization
  - Rich text formatting in Google Docs:
    - Blue, bold categories
    - Clickable source URLs
    - Grey, italic metadata
  - Manual sync option for offline use
  - Changes sync both ways

- **User Interface**
  - Modern, clean interface
  - Easy note management (view, edit, delete)
  - Swipe-to-delete on touch devices
  - Delete button on desktop
  - Interactive first-time user tutorial
  - Compact, user-friendly dialogs
  - Responsive design that works on any screen size

- **Search & Filter**
  - Full-text search through notes
  - Filter by category
  - Filter by date range
  - Filter by source URL
  - Quick access to all saved notes

## Installation

1. Clone this repository or download the ZIP file
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Setup

1. Create a Google Cloud Project and enable the Google Docs API
2. Create OAuth 2.0 credentials and replace the `${CLIENT_ID}` in manifest.json with your client ID
3. Install the extension in Chrome
4. On first launch:
   - Authorize the extension to access Google Docs
   - Complete the interactive tutorial
   - Start capturing and organizing your notes!

## Performance

- Minimal impact on browser performance
- Efficient data syncing with Google Docs
- Follows Google's API usage guidelines
- Compatible with latest Chrome versions

## Future Enhancements

- Export notes to additional formats (PDF, Markdown)
- Cross-browser compatibility (Firefox, Edge)
- AI-powered categorization
- Enhanced search capabilities

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
