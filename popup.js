document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    loadSettings();
    
    // Add event listeners
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    document.getElementById('clear-settings').addEventListener('click', clearSettings);
    document.getElementById('start-transcription').addEventListener('click', startTranscription);
    document.getElementById('stop-transcription').addEventListener('click', stopTranscription);
    
    // Add range input listeners
    document.getElementById('font-size').addEventListener('input', updateFontSizeValue);
    document.getElementById('opacity').addEventListener('input', updateOpacityValue);
    
    // Add API key validation listeners
    document.getElementById('elevenlabs-api-key').addEventListener('blur', validateElevenLabsKey);
    document.getElementById('kick-api-key').addEventListener('blur', validateKickKey);
});

async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get([
            'elevenlabsApiKey',
            'kickApiKey',
            'transcriptionModel',
            'fontSize',
            'opacity',
            'position',
            'latencyMode'
        ]);
        
        document.getElementById('elevenlabs-api-key').value = result.elevenlabsApiKey || '';
        document.getElementById('kick-api-key').value = result.kickApiKey || '';
        document.getElementById('transcription-model').value = result.transcriptionModel || 'eleven_english_sts_v2';
        document.getElementById('font-size').value = result.fontSize || 18;
        document.getElementById('opacity').value = result.opacity || 0.8;
        document.getElementById('position').value = result.position || 'bottom';
        document.getElementById('latency-mode').value = result.latencyMode || 'low';
        
        updateFontSizeValue();
        updateOpacityValue();
        
        updateStatus('Settings loaded successfully', 'success');
    } catch (error) {
        updateStatus('Error loading settings: ' + error.message, 'error');
    }
}

async function saveSettings() {
    try {
        const settings = {
            elevenlabsApiKey: document.getElementById('elevenlabs-api-key').value,
            kickApiKey: document.getElementById('kick-api-key').value,
            transcriptionModel: document.getElementById('transcription-model').value,
            fontSize: parseInt(document.getElementById('font-size').value),
            opacity: parseFloat(document.getElementById('opacity').value),
            position: document.getElementById('position').value,
            latencyMode: document.getElementById('latency-mode').value
        };
        
        await chrome.storage.sync.set(settings);
        
        // Send settings to content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url.includes('kick.com')) {
            await chrome.tabs.sendMessage(tab.id, {
                action: 'updateSettings',
                settings: settings
            });
        }
        
        updateStatus('Settings saved successfully', 'success');
    } catch (error) {
        updateStatus('Error saving settings: ' + error.message, 'error');
    }
}

async function clearSettings() {
    try {
        await chrome.storage.sync.clear();
        
        // Reset form
        document.getElementById('elevenlabs-api-key').value = '';
        document.getElementById('kick-api-key').value = '';
        document.getElementById('transcription-model').value = 'eleven_english_sts_v2';
        document.getElementById('font-size').value = 18;
        document.getElementById('opacity').value = 0.8;
        document.getElementById('position').value = 'bottom';
        document.getElementById('latency-mode').value = 'low';
        
        updateFontSizeValue();
        updateOpacityValue();
        
        updateStatus('Settings cleared successfully', 'success');
    } catch (error) {
        updateStatus('Error clearing settings: ' + error.message, 'error');
    }
}

async function startTranscription() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.url.includes('kick.com')) {
            updateStatus('Please navigate to a Kick stream page', 'warning');
            return;
        }
        
        const settings = await getCurrentSettings();
        
        if (!settings.elevenlabsApiKey) {
            updateStatus('Please enter your ElevenLabs API key', 'error');
            return;
        }
        
        // Test API connection before starting
        updateStatus('Testing API connection...', 'info');
        const testResult = await testElevenLabsConnection(settings.elevenlabsApiKey);
        
        if (!testResult.success) {
            updateStatus('API test failed: ' + testResult.error, 'error');
            return;
        }
        
        await chrome.tabs.sendMessage(tab.id, {
            action: 'startTranscription',
            settings: settings
        });
        
        const latencyMode = settings.latencyMode;
        updateStatus(`Transcription started (${latencyMode} latency mode)`, 'success');
    } catch (error) {
        updateStatus('Error starting transcription: ' + error.message, 'error');
    }
}

async function stopTranscription() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab && tab.url.includes('kick.com')) {
            await chrome.tabs.sendMessage(tab.id, {
                action: 'stopTranscription'
            });
        }
        
        updateStatus('Transcription stopped', 'success');
    } catch (error) {
        updateStatus('Error stopping transcription: ' + error.message, 'error');
    }
}

async function validateElevenLabsKey() {
    const apiKey = document.getElementById('elevenlabs-api-key').value;
    if (!apiKey) return;
    
    try {
        updateStatus('Validating ElevenLabs API key...', 'info');
        const result = await chrome.runtime.sendMessage({
            action: 'validateApiKey',
            apiKey: apiKey,
            service: 'elevenlabs'
        });
        
        if (result.valid) {
            updateStatus(result.message, 'success');
        } else {
            updateStatus('Invalid API key: ' + result.error, 'error');
        }
    } catch (error) {
        updateStatus('Error validating API key: ' + error.message, 'error');
    }
}

async function validateKickKey() {
    const apiKey = document.getElementById('kick-api-key').value;
    if (!apiKey) return;
    
    try {
        updateStatus('Validating Kick API key...', 'info');
        const result = await chrome.runtime.sendMessage({
            action: 'validateApiKey',
            apiKey: apiKey,
            service: 'kick'
        });
        
        if (result.valid) {
            updateStatus(result.message, 'success');
        } else {
            updateStatus('Invalid Kick API key: ' + result.error, 'error');
        }
    } catch (error) {
        updateStatus('Error validating Kick API key: ' + error.message, 'error');
    }
}

async function testElevenLabsConnection(apiKey) {
    try {
        const result = await chrome.runtime.sendMessage({
            action: 'testElevenLabsConnection',
            apiKey: apiKey
        });
        
        return result;
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function getCurrentSettings() {
    return {
        elevenlabsApiKey: document.getElementById('elevenlabs-api-key').value,
        kickApiKey: document.getElementById('kick-api-key').value,
        transcriptionModel: document.getElementById('transcription-model').value,
        fontSize: parseInt(document.getElementById('font-size').value),
        opacity: parseFloat(document.getElementById('opacity').value),
        position: document.getElementById('position').value,
        latencyMode: document.getElementById('latency-mode').value
    };
}

function updateFontSizeValue() {
    const value = document.getElementById('font-size').value;
    document.getElementById('font-size-value').textContent = value + 'px';
}

function updateOpacityValue() {
    const value = document.getElementById('opacity').value;
    document.getElementById('opacity-value').textContent = Math.round(value * 100) + '%';
}

function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = 'status ' + type;
    
    // Auto-clear success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusElement.textContent = 'Ready';
            statusElement.className = 'status';
        }, 3000);
    }
}