class KickStreamTranscriber {
    constructor() {
        this.settings = {};
        this.isTranscribing = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.transcriptionOverlay = null;
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.rafId = null;
        
        // Low latency optimizations
        this.audioBuffer = [];
        this.processingQueue = [];
        this.isProcessing = false;
        this.lastTranscriptionTime = 0;
        this.audioLevelThreshold = 0.01;
        this.minChunkDuration = 1000;
        this.maxChunkDuration = 3000;
        this.audioLevelHistory = [];
        this.silenceThreshold = 0.005;
        this.silenceDuration = 500;
        
        // Error handling
        this.errorCount = 0;
        this.maxErrors = 5;
        this.retryDelay = 2000;
        
        // Overlay visibility tracking
        this.overlayVisible = false;
        this.lastTextUpdate = 0;
        this.visibilityCheckInterval = null;
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadSettings();
            this.injectStyles();
            this.createTranscriptionOverlay();
            
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                this.handleMessage(message, sender, sendResponse);
            });
            
            this.watchForVideo();
            this.startVisibilityMonitoring();
            
            console.log('Kick Stream Transcriber initialized successfully');
        } catch (error) {
            console.error('Error initializing transcriber:', error);
        }
    }
    
    async loadSettings() {
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
            
            this.settings = {
                elevenlabsApiKey: result.elevenlabsApiKey || '',
                kickApiKey: result.kickApiKey || '',
                transcriptionLanguage: 'en',
                transcriptionModel: result.transcriptionModel || 'eleven_english_sts_v2',
                fontSize: result.fontSize || 18,
                opacity: result.opacity || 0.8,
                position: result.position || 'bottom',
                latencyMode: result.latencyMode || 'low'
            };
            
            this.adjustLatencySettings();
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    adjustLatencySettings() {
        switch (this.settings.latencyMode) {
            case 'ultra':
                this.minChunkDuration = 500;
                this.maxChunkDuration = 1500;
                this.silenceDuration = 200;
                break;
            case 'low':
                this.minChunkDuration = 1000;
                this.maxChunkDuration = 3000;
                this.silenceDuration = 500;
                break;
            case 'medium':
                this.minChunkDuration = 2000;
                this.maxChunkDuration = 5000;
                this.silenceDuration = 1000;
                break;
            default:
                this.minChunkDuration = 1000;
                this.maxChunkDuration = 3000;
                this.silenceDuration = 500;
        }
    }
    
    handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'startTranscription':
                    this.settings = { ...this.settings, ...message.settings };
                    this.settings.transcriptionLanguage = 'en';
                    this.settings.transcriptionModel = 'eleven_english_sts_v2';
                    this.adjustLatencySettings();
                    this.startTranscription();
                    sendResponse({ success: true });
                    break;
                    
                case 'stopTranscription':
                    this.stopTranscription();
                    sendResponse({ success: true });
                    break;
                    
                case 'updateSettings':
                    this.settings = { ...this.settings, ...message.settings };
                    this.settings.transcriptionLanguage = 'en';
                    this.settings.transcriptionModel = 'eleven_english_sts_v2';
                    this.adjustLatencySettings();
                    this.updateOverlayStyles();
                    sendResponse({ success: true });
                    break;
                    
                case 'ping':
                    sendResponse({ success: true, message: 'Content script active' });
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    
    startVisibilityMonitoring() {
        this.visibilityCheckInterval = setInterval(() => {
            if (this.isTranscribing && this.transcriptionOverlay) {
                const isVisible = this.transcriptionOverlay.style.display !== 'none';
                if (!isVisible && this.overlayVisible) {
                    console.warn('Overlay became invisible, attempting to restore...');
                    this.showOverlay();
                }
                this.overlayVisible = isVisible;
            }
        }, 2000);
    }
    
    watchForVideo() {
        this.checkForVideo();
        
        const observer = new MutationObserver(() => {
            this.checkForVideo();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    checkForVideo() {
        try {
            const videoElements = document.querySelectorAll('video');
            
            videoElements.forEach(video => {
                if (video.src && !video.hasAttribute('data-transcriber-watched')) {
                    video.setAttribute('data-transcriber-watched', 'true');
                    this.setupVideoListener(video);
                }
            });
        } catch (error) {
            console.error('Error checking for video:', error);
        }
    }
    
    setupVideoListener(video) {
        try {
            video.addEventListener('play', () => {
                console.log('Video started playing');
                if (this.isTranscribing) {
                    this.startAudioCapture(video);
                }
            });
            
            video.addEventListener('pause', () => {
                console.log('Video paused');
                this.stopAudioCapture();
            });
            
            video.addEventListener('ended', () => {
                console.log('Video ended');
                this.stopAudioCapture();
            });
            
        } catch (error) {
            console.error('Error setting up video listener:', error);
        }
    }
    
    async startTranscription() {
        if (this.isTranscribing) {
            return;
        }
        
        if (!this.settings.elevenlabsApiKey) {
            console.error('ElevenLabs API key not configured');
            this.showError('ElevenLabs API key not configured');
            return;
        }
        
        this.isTranscribing = true;
        this.errorCount = 0;
        this.showOverlay();
        
        this.updateTranscriptionText('Transcription starting... Please wait for audio to be detected.');
        
        const video = document.querySelector('video[data-transcriber-watched]');
        if (video && !video.paused) {
            await this.startAudioCapture(video);
        } else {
            console.log('No active video found, waiting for video to start...');
        }
        
        console.log('Transcription started with low latency mode:', this.settings.latencyMode);
    }
    
    stopTranscription() {
        this.isTranscribing = false;
        this.stopAudioCapture();
        this.hideOverlay();
        this.clearProcessingQueue();
        
        if (this.visibilityCheckInterval) {
            clearInterval(this.visibilityCheckInterval);
            this.visibilityCheckInterval = null;
        }
        
        console.log('Transcription stopped');
    }
    
    async startAudioCapture(video) {
        try {
            console.log('Starting audio capture...');
            
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000,
                latencyHint: 'interactive'
            });
            
            const destination = this.audioContext.createMediaStreamDestination();
            const source = this.audioContext.createMediaElementSource(video);
            source.connect(destination);
            source.connect(this.audioContext.destination);
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.3;
            source.connect(this.analyser);
            
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
            const options = {
                mimeType: 'audio/webm;codecs=opus',
                audioBitsPerSecond: 64000
            };
            
            this.mediaRecorder = new MediaRecorder(destination.stream, options);
            
            this.audioChunks = [];
            this.audioBuffer = [];
            this.processingQueue = [];
            this.isProcessing = false;
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    this.processAudioChunkOptimized();
                }
            };
            
            this.mediaRecorder.start(this.minChunkDuration);
            this.startAudioLevelMonitoring();
            
            console.log('Audio capture started successfully');
            
        } catch (error) {
            console.error('Error starting audio capture:', error);
            this.showError('Failed to start audio capture: ' + error.message);
        }
    }
    
    startAudioLevelMonitoring() {
        const checkAudioLevel = () => {
            if (!this.isTranscribing || !this.analyser) return;
            
            try {
                this.analyser.getByteFrequencyData(this.dataArray);
                const average = this.dataArray.reduce((a, b) => a + b) / this.dataArray.length;
                const normalizedLevel = average / 255;
                
                this.audioLevelHistory.push(normalizedLevel);
                if (this.audioLevelHistory.length > 10) {
                    this.audioLevelHistory.shift();
                }
                
                const recentAverage = this.audioLevelHistory.slice(-5).reduce((a, b) => a + b) / 5;
                if (recentAverage < this.silenceThreshold && this.audioChunks.length > 0) {
                    this.processAudioChunkOptimized();
                }
                
                this.rafId = requestAnimationFrame(checkAudioLevel);
            } catch (error) {
                console.error('Error in audio level monitoring:', error);
            }
        };
        
        checkAudioLevel();
    }
    
    stopAudioCapture() {
        try {
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }
            
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }
            
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }
            
            this.analyser = null;
            this.dataArray = null;
        } catch (error) {
            console.error('Error stopping audio capture:', error);
        }
    }
    
    async processAudioChunkOptimized() {
        if (this.audioChunks.length === 0 || this.isProcessing) return;
        
        const totalSize = this.audioChunks.reduce((sum, chunk) => sum + chunk.size, 0);
        if (totalSize < 1000) return;
        
        this.isProcessing = true;
        
        try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            this.audioChunks = [];
            
            this.updateTranscriptionText('Processing audio...');
            
            this.transcribeAudioOptimized(audioBlob).then(transcription => {
                if (transcription) {
                    this.updateTranscriptionText(transcription);
                    this.errorCount = 0;
                } else {
                    this.updateTranscriptionText('Listening for speech...');
                }
                this.isProcessing = false;
                
                if (this.audioChunks.length > 0) {
                    setTimeout(() => this.processAudioChunkOptimized(), 50);
                }
            }).catch(error => {
                console.error('Transcription error:', error);
                this.errorCount++;
                this.isProcessing = false;
                
                this.updateTranscriptionText('Processing audio... Please wait.');
                
                if (this.errorCount >= this.maxErrors) {
                    this.showError('Too many transcription errors. Please check your API key and internet connection.');
                    this.stopTranscription();
                }
            });
            
        } catch (error) {
            console.error('Error processing audio chunk:', error);
            this.isProcessing = false;
        }
    }
    
    async transcribeAudioOptimized(audioBlob) {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'audio.webm');
            formData.append('model_id', 'eleven_english_sts_v2');
            formData.append('language', 'en');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
                method: 'POST',
                headers: {
                    'xi-api-key': this.settings.elevenlabsApiKey
                },
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            const result = await response.json();
            
            if (!result.text || result.text.trim() === '') {
                return null;
            }
            
            return result.text;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('Transcription request timed out');
                throw new Error('Transcription request timed out');
            } else {
                console.error('Transcription error:', error);
                throw error;
            }
        }
    }
    
    clearProcessingQueue() {
        this.processingQueue = [];
        this.audioChunks = [];
        this.isProcessing = false;
    }
    
    createTranscriptionOverlay() {
        try {
            const existingOverlay = document.getElementById('kick-transcription-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }
            
            this.transcriptionOverlay = document.createElement('div');
            this.transcriptionOverlay.id = 'kick-transcription-overlay';
            this.transcriptionOverlay.innerHTML = `
                <div class="transcription-text">Ready for transcription...</div>
                <div class="latency-indicator"></div>
            `;
            
            document.body.appendChild(this.transcriptionOverlay);
            this.updateOverlayStyles();
            this.forceOverlayVisibility();
            
            console.log('Transcription overlay created successfully');
        } catch (error) {
            console.error('Error creating transcription overlay:', error);
        }
    }
    
    forceOverlayVisibility() {
        if (!this.transcriptionOverlay) return;
        
        try {
            // Force critical visibility properties
            this.transcriptionOverlay.style.setProperty('display', 'block', 'important');
            this.transcriptionOverlay.style.setProperty('visibility', 'visible', 'important');
            this.transcriptionOverlay.style.setProperty('opacity', '1', 'important');
            this.transcriptionOverlay.style.setProperty('z-index', '999999', 'important');
            
            const textElement = this.transcriptionOverlay.querySelector('.transcription-text');
            if (textElement) {
                textElement.style.setProperty('display', 'flex', 'important');
                textElement.style.setProperty('visibility', 'visible', 'important');
                textElement.style.setProperty('opacity', '1', 'important');
                textElement.style.setProperty('color', 'white', 'important');
                textElement.style.setProperty('background', 'rgba(0, 0, 0, 0.9)', 'important');
            }
            
            this.overlayVisible = true;
            console.log('Overlay visibility forced');
        } catch (error) {
            console.error('Error forcing overlay visibility:', error);
        }
    }
    
    updateOverlayStyles() {
        if (!this.transcriptionOverlay) return;
        
        try {
            const textElement = this.transcriptionOverlay.querySelector('.transcription-text');
            const indicatorElement = this.transcriptionOverlay.querySelector('.latency-indicator');
            
            const overlayWidth = 1000;
            const overlayHeight = 250;
            const leftPosition = `calc(50% - ${overlayWidth / 2}px)`;
            
            const positionStyles = {
                bottom: {
                    bottom: '20px',
                    left: leftPosition,
                    width: `${overlayWidth}px`,
                    height: `${overlayHeight}px`,
                    right: 'auto',
                    top: 'auto'
                },
                top: {
                    top: '20px',
                    left: leftPosition,
                    width: `${overlayWidth}px`,
                    height: `${overlayHeight}px`,
                    right: 'auto',
                    bottom: 'auto'
                },
                center: {
                    top: '50%',
                    left: leftPosition,
                    width: `${overlayWidth}px`,
                    height: `${overlayHeight}px`,
                    right: 'auto',
                    bottom: 'auto',
                    transform: 'translateY(-50%)'
                }
            };
            
            Object.assign(this.transcriptionOverlay.style, {
                position: 'fixed',
                zIndex: '999999',
                pointerEvents: 'none',
                display: 'block',
                ...positionStyles[this.settings.position]
            });
            
            Object.assign(textElement.style, {
                background: 'rgba(0, 0, 0, 0.9)',
                color: 'white',
                padding: '20px',
                borderRadius: '12px',
                fontSize: `${this.settings.fontSize}px`,
                fontWeight: '600',
                lineHeight: '1.5',
                textAlign: 'center',
                opacity: this.settings.opacity,
                fontFamily: 'Arial, Helvetica, sans-serif',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(8px)',
                border: '3px solid rgba(255, 255, 255, 0.3)',
                transition: 'all 0.2s ease',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale'
            });
            
            Object.assign(indicatorElement.style, {
                position: 'absolute',
                top: '-8px',
                right: '10px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: this.getLatencyColor(),
                border: '2px solid white',
                boxShadow: '0 0 8px rgba(0, 0, 0, 0.3)'
            });
            
        } catch (error) {
            console.error('Error updating overlay styles:', error);
        }
    }
    
    getLatencyColor() {
        switch (this.settings.latencyMode) {
            case 'ultra': return '#00ff00';
            case 'low': return '#ffff00';
            case 'medium': return '#ff8800';
            default: return '#ffff00';
        }
    }
    
    showOverlay() {
        if (this.transcriptionOverlay) {
            this.forceOverlayVisibility();
            console.log('Overlay shown');
        }
    }
    
    hideOverlay() {
        if (this.transcriptionOverlay) {
            this.transcriptionOverlay.style.display = 'none';
            this.overlayVisible = false;
            console.log('Overlay hidden');
        }
    }
    
    showError(message) {
        if (!this.transcriptionOverlay) return;
        
        const textElement = this.transcriptionOverlay.querySelector('.transcription-text');
        if (textElement) {
            textElement.textContent = `Error: ${message}`;
            textElement.classList.add('error');
            
            // Reset after 5 seconds
            setTimeout(() => {
                textElement.classList.remove('error');
                textElement.textContent = 'Ready for transcription...';
            }, 5000);
        }
    }
    
    updateTranscriptionText(text) {
        if (!this.transcriptionOverlay) return;
        
        try {
            const textElement = this.transcriptionOverlay.querySelector('.transcription-text');
            const currentTime = Date.now();
            
            const latency = currentTime - this.lastTranscriptionTime;
            this.lastTranscriptionTime = currentTime;
            
            const cleanText = this.cleanTextForDisplay(text);
            
            // Remove all state classes
            textElement.classList.remove('error', 'processing', 'listening');
            
            if (cleanText && cleanText.trim() !== '') {
                textElement.textContent = cleanText;
                textElement.style.animation = 'none';
                textElement.offsetHeight;
                textElement.style.animation = 'fadeInUp 0.2s ease-out';
                
                const indicatorElement = this.transcriptionOverlay.querySelector('.latency-indicator');
                if (indicatorElement) {
                    indicatorElement.style.backgroundColor = latency < 2000 ? '#00ff00' : 
                                                           latency < 4000 ? '#ffff00' : '#ff0000';
                }
                
                const hideDelay = this.settings.latencyMode === 'ultra' ? 8000 : 15000;
                setTimeout(() => {
                    if (textElement.textContent === cleanText) {
                        textElement.textContent = 'Listening for speech...';
                        textElement.classList.add('listening');
                    }
                }, hideDelay);
                
                console.log('Transcription updated:', cleanText);
            } else if (text.includes('Processing')) {
                textElement.textContent = cleanText;
                textElement.classList.add('processing');
            } else if (text.includes('Listening')) {
                textElement.textContent = cleanText;
                textElement.classList.add('listening');
            } else {
                textElement.textContent = cleanText;
            }
        } catch (error) {
            console.error('Error updating transcription text:', error);
        }
    }
    
    cleanTextForDisplay(text) {
        try {
            // Handle null or undefined text
            if (!text || typeof text !== 'string') {
                return 'Listening for speech...';
            }
            
            // Remove any non-Latin characters and ensure English text
            let cleaned = text
                .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
                .replace(/\s+/g, ' ') // Normalize whitespace
                .replace(/[^\w\s.,!?;:'"()-]/g, '') // Keep only letters, numbers, spaces, and common punctuation
                .trim();
            
            // If text is empty after cleaning, provide alternative text
            if (!cleaned || cleaned.length === 0) {
                return 'Listening for speech...';
            }
            
            // Ensure text is in proper English format
            cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
            
            // Limit text length to prevent overflow
            if (cleaned.length > 200) {
                cleaned = cleaned.substring(0, 197) + '...';
            }
            
            // Ensure we have actual content (not just punctuation)
            const hasContent = /[a-zA-Z]/.test(cleaned);
            if (!hasContent) {
                return 'Listening for speech...';
            }
            
            return cleaned;
        } catch (error) {
            console.error('Error cleaning text:', error);
            return 'Processing audio...';
        }
    }
    
    injectStyles() {
        try {
            // Check if styles are already injected
            if (document.getElementById('kick-transcriber-styles')) {
                return;
            }
            
            const styleElement = document.createElement('style');
            styleElement.id = 'kick-transcriber-styles';
            styleElement.textContent = `
                #kick-transcription-overlay {
                    position: fixed !important;
                    z-index: 999999 !important;
                    pointer-events: none !important;
                    font-family: Arial, Helvetica, sans-serif !important;
                    transition: all 0.3s ease !important;
                    display: block !important;
                    visibility: visible !important;
                }
                
                #kick-transcription-overlay .transcription-text {
                    background: rgba(0, 0, 0, 0.9) !important;
                    color: white !important;
                    padding: 20px !important;
                    border-radius: 12px !important;
                    font-size: 18px !important;
                    font-weight: 600 !important;
                    line-height: 1.5 !important;
                    text-align: center !important;
                    opacity: 1 !important;
                    visibility: visible !important;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8) !important;
                    backdrop-filter: blur(8px) !important;
                    border: 3px solid rgba(255, 255, 255, 0.3) !important;
                    transition: all 0.2s ease !important;
                    width: 100% !important;
                    height: 100% !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    box-sizing: border-box !important;
                    word-wrap: break-word !important;
                    overflow-wrap: break-word !important;
                    text-rendering: optimizeLegibility !important;
                    -webkit-font-smoothing: antialiased !important;
                    -moz-osx-font-smoothing: grayscale !important;
                }
                
                #kick-transcription-overlay .latency-indicator {
                    position: absolute !important;
                    top: -8px !important;
                    right: 10px !important;
                    width: 12px !important;
                    height: 12px !important;
                    border-radius: 50% !important;
                    border: 2px solid white !important;
                    box-shadow: 0 0 8px rgba(0, 0, 0, 0.3) !important;
                    transition: background-color 0.3s ease !important;
                }
                
                @keyframes fadeInUp {
                    0% {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes shake {
                    0%, 100% {
                        transform: translateX(0);
                    }
                    10%, 30%, 50%, 70%, 90% {
                        transform: translateX(-5px);
                    }
                    20%, 40%, 60%, 80% {
                        transform: translateX(5px);
                    }
                }
                
                @keyframes pulse {
                    0% {
                        opacity: 0.8;
                    }
                    50% {
                        opacity: 1;
                    }
                    100% {
                        opacity: 0.8;
                    }
                }
                
                #kick-transcription-overlay .transcription-text.error {
                    background: rgba(255, 0, 0, 0.9) !important;
                    color: white !important;
                    animation: shake 0.5s ease-in-out !important;
                }
                
                #kick-transcription-overlay .transcription-text.processing {
                    background: rgba(0, 100, 255, 0.9) !important;
                    color: white !important;
                    animation: pulse 1s ease-in-out infinite !important;
                }
                
                #kick-transcription-overlay .transcription-text.listening {
                    background: rgba(0, 150, 0, 0.9) !important;
                    color: white !important;
                    animation: pulse 2s ease-in-out infinite !important;
                }
            `;
            
            document.head.appendChild(styleElement);
            console.log('Styles injected successfully');
        } catch (error) {
            console.error('Error injecting styles:', error);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new KickStreamTranscriber();
    });
} else {
    new KickStreamTranscriber();
} 