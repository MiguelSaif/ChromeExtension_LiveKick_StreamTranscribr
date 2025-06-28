# Kick Stream Transcriber Chrome Extension

A Chrome extension that automatically transcribes Kick streaming videos using the ElevenLabs Speech-to-Text API and displays the transcriptions as an overlay on the video. **Optimized for ultra-low latency transcription.**

## Features

- **Ultra-Low Latency Transcription**: Multiple latency modes from 0.5s to 8s chunks
- **Real-time Audio Processing**: Optimized audio capture and processing pipeline
- **Smart Silence Detection**: Early chunk processing during silence periods
- **Customizable Overlay**: Adjustable font size, opacity, and position
- **Multiple Languages**: Support for English, Spanish, French, German, Italian, Portuguese, and auto-detection
- **ElevenLabs Integration**: Uses ElevenLabs' advanced speech-to-text models
- **Settings Management**: Save and load your preferences
- **Responsive Design**: Works on desktop and mobile devices
- **Latency Monitoring**: Real-time latency indicator and performance tracking

## Latency Modes

### Ultra Low (0.5-1.5s chunks)
- **Best for**: Live conversations, real-time interaction
- **Latency**: ~1-2 seconds
- **API Usage**: High
- **Use case**: When you need the fastest possible transcription

### Low (1-3s chunks) ⭐ **Recommended**
- **Best for**: Most streaming scenarios
- **Latency**: ~2-4 seconds
- **API Usage**: Moderate
- **Use case**: Balanced performance and API usage

### Medium (2-5s chunks)
- **Best for**: Longer content, cost optimization
- **Latency**: ~4-6 seconds
- **API Usage**: Lower
- **Use case**: When API costs are a concern

### High (3-8s chunks)
- **Best for**: Background transcription, minimal API usage
- **Latency**: ~6-10 seconds
- **API Usage**: Minimal
- **Use case**: When you want minimal API consumption

## Prerequisites

Before using this extension, you'll need:

1. **ElevenLabs API Key**: Get your free API key from [ElevenLabs](https://elevenlabs.io/)
2. **Chrome Browser**: Version 88 or higher
3. **Kick Account**: To access streaming content

## Installation

### Method 1: Load Unpacked Extension (Development)

1. **Download the Extension**:
   - Clone or download this repository
   - Extract the files to a folder on your computer

2. **Open Chrome Extensions**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner

3. **Load the Extension**:
   - Click "Load unpacked"
   - Select the folder containing the extension files
   - The extension should now appear in your extensions list

### Method 2: Install from Chrome Web Store (Coming Soon)

*This extension will be available on the Chrome Web Store soon.*

## Setup

### 1. Get Your ElevenLabs API Key

1. Go to [ElevenLabs](https://elevenlabs.io/)
2. Sign up for a free account
3. Navigate to your profile settings
4. Copy your API key

### 2. Configure the Extension

1. **Open the Extension**:
   - Click the extension icon in your Chrome toolbar
   - Or right-click the icon and select "Options"

2. **Enter Your API Key**:
   - Paste your ElevenLabs API key in the "ElevenLabs API Key" field
   - Optionally enter a Kick API key if you have one

3. **Choose Latency Mode**:
   - Select your preferred latency mode based on your needs
   - Start with "Low" mode for best balance

4. **Adjust Settings**:
   - Choose your preferred language
   - Select the transcription model
   - Customize the display settings (font size, opacity, position)

5. **Save Settings**:
   - Click "Save Settings" to store your preferences

## Usage

### Starting Transcription

1. **Navigate to a Kick Stream**:
   - Go to any live stream on [kick.com](https://kick.com)
   - Make sure the stream is playing

2. **Start Transcription**:
   - Click the extension icon
   - Click "Start Transcription"
   - The transcription overlay will appear on the video with a latency indicator

### Understanding the Latency Indicator

The colored dot on the transcription overlay shows your current latency:
- **🟢 Green**: Excellent latency (< 2 seconds)
- **🟡 Yellow**: Good latency (2-4 seconds)
- **🔴 Red**: High latency (> 4 seconds)

### Stopping Transcription

- Click the extension icon and select "Stop Transcription"
- Or close the Kick tab

### Customizing the Display

You can adjust the transcription display in real-time:

- **Font Size**: 12px to 32px
- **Opacity**: 10% to 100%
- **Position**: Bottom, Top, or Center of the video

## Technical Optimizations

### Low Latency Features

1. **Optimized Audio Capture**:
   - Lower sample rate (16kHz) for faster processing
   - Reduced bitrate (64kbps) for smaller chunks
   - Hardware-accelerated audio processing

2. **Smart Chunk Processing**:
   - Variable chunk sizes based on latency mode
   - Silence detection for early processing
   - Parallel processing queue

3. **API Optimizations**:
   - Request timeouts to prevent hanging
   - Streaming latency optimization flags
   - Background processing to avoid blocking

4. **UI Performance**:
   - Hardware-accelerated animations
   - Optimized DOM updates
   - Reduced reflow operations

### Audio Processing Pipeline

1. **Capture**: Web Audio API with optimized settings
2. **Analysis**: Real-time audio level monitoring
3. **Chunking**: Smart silence-based chunk creation
4. **Processing**: Background API calls with timeouts
5. **Display**: Hardware-accelerated overlay updates

## API Integration

### ElevenLabs API

This extension uses ElevenLabs' Speech-to-Text API for transcription:

- **Endpoint**: `https://api.elevenlabs.io/v1/speech-to-text`
- **Models**: 
  - `eleven_multilingual_v2` (recommended for multi-language support)
  - `eleven_english_sts_v2` (optimized for English)
- **Optimizations**: Streaming latency flags, reduced bitrate

### Kick API (Optional)

The extension can optionally use the Kick API for additional stream information:

- **Endpoint**: `https://api.kick.com/public/v1/`
- **Authentication**: Bearer token (optional)

## Performance Tips

### For Ultra-Low Latency

1. **Use Ultra Mode**: Select "Ultra Low" latency mode
2. **Strong Internet**: Ensure stable, fast internet connection
3. **Close Other Tabs**: Reduce browser resource usage
4. **Hardware Acceleration**: Enable GPU acceleration in Chrome

### For Cost Optimization

1. **Use Medium/High Mode**: Higher latency modes use less API calls
2. **Monitor Usage**: Check your ElevenLabs dashboard regularly
3. **Quality Settings**: Lower bitrate reduces data transfer

## Troubleshooting

### Common Issues

**"ElevenLabs API key not configured"**
- Make sure you've entered your API key in the extension settings
- Verify the API key is correct and active

**"No transcription appearing"**
- Ensure the stream is playing and has audio
- Check that your API key has sufficient credits
- Try refreshing the page and restarting transcription
- Check the latency indicator color

**"High latency (red indicator)"**
- Try switching to a lower latency mode
- Check your internet connection
- Close other browser tabs
- Restart the extension

**"Extension not working on Kick"**
- Make sure you're on a valid Kick streaming page
- Try refreshing the page
- Check if the extension is enabled in Chrome

### API Limits

- **ElevenLabs Free Tier**: 10,000 characters per month
- **Rate Limits**: Vary by plan, check your ElevenLabs dashboard
- **Latency Impact**: Higher latency modes use fewer API calls

## Development

### Project Structure

```
kick-stream-transcriber/
├── manifest.json          # Extension manifest
├── popup.html            # Extension popup interface
├── popup.css             # Popup styles
├── popup.js              # Popup functionality
├── content.js            # Content script for Kick pages
├── background.js         # Background service worker
├── styles.css            # Overlay styles
├── icons/                # Extension icons
└── README.md             # This file
```

### Building

To modify the extension:

1. Edit the source files
2. Reload the extension in `chrome://extensions/`
3. Test on Kick streaming pages

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Privacy & Security

- **Audio Processing**: Audio is processed locally and sent only to ElevenLabs for transcription
- **Data Storage**: Settings are stored locally in Chrome's sync storage
- **No Tracking**: The extension does not collect or track user data
- **API Keys**: Stored securely in Chrome's encrypted storage

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please:

1. Check the troubleshooting section above
2. Review the ElevenLabs API documentation
3. Open an issue on GitHub

## Changelog

### Version 1.1.0
- Added ultra-low latency modes
- Implemented smart silence detection
- Added real-time latency monitoring
- Optimized audio processing pipeline
- Added hardware acceleration
- Improved UI performance

### Version 1.0.0
- Initial release
- Real-time transcription support
- Customizable overlay
- ElevenLabs API integration
- Settings management 