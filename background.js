// Background service worker for Kick Stream Transcriber

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Kick Stream Transcriber installed');
        
        // Set default settings
        chrome.storage.sync.set({
            transcriptionModel: 'eleven_english_sts_v2',
            fontSize: 18,
            opacity: 0.8,
            position: 'bottom',
            latencyMode: 'low'
        });
    }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'getStreamInfo':
            getStreamInfo(sender.tab.url).then(sendResponse);
            return true; // Keep message channel open for async response
            
        case 'validateApiKey':
            validateApiKey(message.apiKey, message.service).then(sendResponse);
            return true;
            
        case 'testElevenLabsConnection':
            testElevenLabsConnection(message.apiKey).then(sendResponse);
            return true;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
});

// Get stream information from Kick API
async function getStreamInfo(url) {
    try {
        // Extract channel name from URL
        const channelMatch = url.match(/kick\.com\/([^\/\?]+)/);
        if (!channelMatch) {
            return { error: 'Could not extract channel name from URL' };
        }
        
        const channelName = channelMatch[1];
        
        // Get stream info from Kick API
        const response = await fetch(`https://api.kick.com/public/v1/channels/${channelName}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return { success: true, data: data };
        
    } catch (error) {
        console.error('Error fetching stream info:', error);
        return { error: error.message };
    }
}

// Validate API keys
async function validateApiKey(apiKey, service) {
    try {
        if (service === 'elevenlabs') {
            // Validate ElevenLabs API key
            const response = await fetch('https://api.elevenlabs.io/v1/voices', {
                method: 'GET',
                headers: {
                    'xi-api-key': apiKey,
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return { 
                    valid: true, 
                    message: `Valid API key. Available voices: ${data.voices?.length || 0}` 
                };
            } else {
                const errorData = await response.json().catch(() => ({}));
                return { 
                    valid: false, 
                    error: errorData.detail || `Invalid API key (Status: ${response.status})` 
                };
            }
        }
        
        if (service === 'kick') {
            // Validate Kick API key (optional)
            if (!apiKey || apiKey.trim() === '') {
                return { valid: true, message: 'No Kick API key provided (optional)' };
            }
            
            // Test Kick API with the key
            const response = await fetch('https://api.kick.com/public/v1/categories', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            if (response.ok) {
                return { valid: true, message: 'Valid Kick API key' };
            } else {
                return { valid: false, error: `Invalid Kick API key (Status: ${response.status})` };
            }
        }
        
        return { valid: false, error: 'Unknown service' };
        
    } catch (error) {
        console.error('Error validating API key:', error);
        return { valid: false, error: error.message };
    }
}

// Test ElevenLabs connection and models
async function testElevenLabsConnection(apiKey) {
    try {
        // Test basic API access
        const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey,
                'Accept': 'application/json'
            }
        });
        
        if (!voicesResponse.ok) {
            throw new Error(`API access failed: ${voicesResponse.status}`);
        }
        
        // Test speech-to-text models
        const modelsResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text/models', {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey,
                'Accept': 'application/json'
            }
        });
        
        if (!modelsResponse.ok) {
            throw new Error(`Models access failed: ${modelsResponse.status}`);
        }
        
        const modelsData = await modelsResponse.json();
        const englishModel = modelsData.models?.find(m => m.model_id === 'eleven_english_sts_v2');
        
        return {
            success: true,
            message: 'ElevenLabs API connection successful',
            hasEnglishModel: !!englishModel,
            availableModels: modelsData.models?.length || 0
        };
        
    } catch (error) {
        console.error('Error testing ElevenLabs connection:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Handle tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('kick.com')) {
        console.log('Kick page loaded:', tab.url);
        
        // Check if content script is already injected
        chrome.tabs.sendMessage(tabId, { action: 'ping' }).catch(() => {
            // Content script not found, inject it
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            }).catch(error => {
                console.error('Error injecting content script:', error);
            });
        });
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    if (tab.url && tab.url.includes('kick.com')) {
        console.log('Extension icon clicked on Kick page');
        // The popup will handle the click automatically
    }
});

// Handle extension errors
chrome.runtime.onSuspend.addListener(() => {
    console.log('Extension suspended');
});

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        console.log('Settings changed:', changes);
    }
}); 