// Debug script for Kick Stream Transcriber
// Run this in the browser console on a Kick page to test functionality

class TranscriberDebugger {
    constructor() {
        this.testResults = [];
    }
    
    async runAllTests() {
        console.log('🔍 Starting Kick Stream Transcriber Debug Tests...');
        
        await this.testVideoDetection();
        await this.testAudioContext();
        await this.testOverlayCreation();
        await this.testAPICompatibility();
        await this.testSettings();
        
        this.displayResults();
    }
    
    async testVideoDetection() {
        console.log('📹 Testing video detection...');
        
        const videos = document.querySelectorAll('video');
        const result = {
            test: 'Video Detection',
            success: videos.length > 0,
            details: `Found ${videos.length} video elements`,
            videos: Array.from(videos).map(v => ({
                src: v.src,
                paused: v.paused,
                currentTime: v.currentTime,
                duration: v.duration
            }))
        };
        
        this.testResults.push(result);
        console.log(result);
    }
    
    async testAudioContext() {
        console.log('🎵 Testing audio context...');
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const result = {
                test: 'Audio Context',
                success: true,
                details: `Audio context created successfully. Sample rate: ${audioContext.sampleRate}Hz`,
                state: audioContext.state
            };
            
            await audioContext.close();
            this.testResults.push(result);
            console.log(result);
        } catch (error) {
            const result = {
                test: 'Audio Context',
                success: false,
                details: `Failed to create audio context: ${error.message}`,
                error: error
            };
            
            this.testResults.push(result);
            console.log(result);
        }
    }
    
    async testOverlayCreation() {
        console.log('🖼️ Testing overlay creation...');
        
        try {
            const overlay = document.createElement('div');
            overlay.id = 'test-transcription-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 1000px;
                height: 250px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: Arial, sans-serif;
                font-size: 18px;
                border-radius: 12px;
            `;
            overlay.textContent = 'Test Overlay - Click to remove';
            overlay.onclick = () => overlay.remove();
            
            document.body.appendChild(overlay);
            
            const result = {
                test: 'Overlay Creation',
                success: true,
                details: 'Overlay created and displayed successfully',
                dimensions: {
                    width: overlay.offsetWidth,
                    height: overlay.offsetHeight
                }
            };
            
            this.testResults.push(result);
            console.log(result);
            
            // Remove test overlay after 3 seconds
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.remove();
                }
            }, 3000);
            
        } catch (error) {
            const result = {
                test: 'Overlay Creation',
                success: false,
                details: `Failed to create overlay: ${error.message}`,
                error: error
            };
            
            this.testResults.push(result);
            console.log(result);
        }
    }
    
    async testAPICompatibility() {
        console.log('🔌 Testing API compatibility...');
        
        try {
            // Test ElevenLabs API endpoint
            const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text/models', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            const result = {
                test: 'API Compatibility',
                success: response.ok,
                details: `ElevenLabs API response: ${response.status} ${response.statusText}`,
                endpoint: 'https://api.elevenlabs.io/v1/speech-to-text/models'
            };
            
            if (response.ok) {
                const data = await response.json();
                result.models = data.models?.length || 0;
                result.hasEnglishModel = data.models?.some(m => m.model_id === 'eleven_english_sts_v2') || false;
            }
            
            this.testResults.push(result);
            console.log(result);
            
        } catch (error) {
            const result = {
                test: 'API Compatibility',
                success: false,
                details: `Failed to test API: ${error.message}`,
                error: error
            };
            
            this.testResults.push(result);
            console.log(result);
        }
    }
    
    async testSettings() {
        console.log('⚙️ Testing settings...');
        
        try {
            const settings = await chrome.storage.sync.get([
                'elevenlabsApiKey',
                'transcriptionModel',
                'fontSize',
                'opacity',
                'position',
                'latencyMode'
            ]);
            
            const result = {
                test: 'Settings',
                success: true,
                details: 'Settings loaded successfully',
                settings: settings,
                hasApiKey: !!settings.elevenlabsApiKey
            };
            
            this.testResults.push(result);
            console.log(result);
            
        } catch (error) {
            const result = {
                test: 'Settings',
                success: false,
                details: `Failed to load settings: ${error.message}`,
                error: error
            };
            
            this.testResults.push(result);
            console.log(result);
        }
    }
    
    displayResults() {
        console.log('\n📊 TEST RESULTS SUMMARY:');
        console.log('========================');
        
        const passed = this.testResults.filter(r => r.success).length;
        const total = this.testResults.length;
        
        console.log(`✅ Passed: ${passed}/${total}`);
        console.log(`❌ Failed: ${total - passed}/${total}`);
        
        this.testResults.forEach(result => {
            const icon = result.success ? '✅' : '❌';
            console.log(`${icon} ${result.test}: ${result.details}`);
        });
        
        if (passed === total) {
            console.log('\n🎉 All tests passed! The extension should work correctly.');
        } else {
            console.log('\n⚠️ Some tests failed. Check the details above for issues.');
        }
    }
}

// Create global debugger instance
window.transcriberDebugger = new TranscriberDebugger();

// Auto-run tests if on Kick page
if (window.location.hostname.includes('kick.com')) {
    console.log('🎯 Kick page detected. Running debug tests...');
    window.transcriberDebugger.runAllTests();
} else {
    console.log('🔧 Debug script loaded. Run window.transcriberDebugger.runAllTests() to test.');
}