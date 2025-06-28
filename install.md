# Quick Installation Guide

## Step 1: Download the Extension
1. Download all the files in this folder to your computer
2. Make sure you have all these files:
   - `manifest.json`
   - `popup.html`
   - `popup.css`
   - `popup.js`
   - `content.js`
   - `background.js`
   - `styles.css`
   - `README.md`
   - `icons/` folder (with icon files)

## Step 2: Get Your ElevenLabs API Key
1. Go to [https://elevenlabs.io/](https://elevenlabs.io/)
2. Sign up for a free account
3. Go to your profile settings
4. Copy your API key

## Step 3: Install in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the folder containing all the extension files
5. The extension should now appear in your extensions list

## Step 4: Configure the Extension
1. Click the extension icon in your Chrome toolbar
2. Enter your ElevenLabs API key
3. **Choose your latency mode**:
   - **Ultra Low**: Fastest response (0.5-1.5s chunks) - best for live conversations
   - **Low**: Balanced performance (1-3s chunks) - **recommended for most users**
   - **Medium**: Lower API usage (2-5s chunks) - good for cost optimization
   - **High**: Minimal API usage (3-8s chunks) - slowest but cheapest
4. Adjust any other settings you want
5. Click "Save Settings"

## Step 5: Test on Kick
1. Go to any live stream on [kick.com](https://kick.com)
2. Click the extension icon
3. Click "Start Transcription"
4. You should see transcriptions appear over the video with a colored latency indicator!

## Understanding the Latency Indicator
The colored dot on the transcription overlay shows your current performance:
- **🟢 Green**: Excellent latency (< 2 seconds)
- **🟡 Yellow**: Good latency (2-4 seconds)  
- **🔴 Red**: High latency (> 4 seconds)

## Troubleshooting
- If you see "ElevenLabs API key not configured", make sure you've entered your API key
- If no transcriptions appear, make sure the stream is playing and has audio
- If the extension doesn't work, try refreshing the page and restarting transcription
- If you see red latency indicator, try switching to a lower latency mode or check your internet connection

## Performance Tips
- **For fastest transcription**: Use "Ultra Low" mode
- **For cost savings**: Use "Medium" or "High" mode
- **For best balance**: Use "Low" mode (recommended)
- Close other browser tabs for better performance
- Ensure you have a stable internet connection

## Need Help?
Check the full README.md file for detailed instructions and troubleshooting tips. 