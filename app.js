class PianoApp {
    constructor() {
        this.audioContext = null;
        this.activeOscillators = new Map();
        this.piano = document.getElementById('piano');
        this.statusText = document.getElementById('status-text');
        
        this.init();
    }
    
    init() {
        this.setupAudio();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
    }
    
    setupAudio() {
        // Initialize Web Audio API on first user interaction
        const initAudio = () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        };
        
        document.addEventListener('click', initAudio, { once: true });
        document.addEventListener('keydown', initAudio, { once: true });
    }
    
    setupEventListeners() {
        // Mouse/Touch events for piano keys
        const keys = document.querySelectorAll('.key');
        
        keys.forEach(key => {
            // Mouse events
            key.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.playNote(key);
            });
            
            key.addEventListener('mouseup', () => {
                this.stopNote(key);
            });
            
            key.addEventListener('mouseleave', () => {
                this.stopNote(key);
            });
            
            // Touch events for mobile
            key.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.playNote(key);
            });
            
            key.addEventListener('touchend', () => {
                this.stopNote(key);
            });
        });
        
        // Global mouse up to stop any playing notes
        document.addEventListener('mouseup', () => {
            keys.forEach(key => this.stopNote(key));
        });
    }
    
    setupKeyboardShortcuts() {
        const keyMap = {};
        
        // Build key map from data attributes
        document.querySelectorAll('.key').forEach(key => {
            const keyboardKey = key.dataset.key;
            if (keyboardKey) {
                keyMap[keyboardKey.toLowerCase()] = key;
            }
        });
        
        // Track pressed keys to prevent repeat
        const pressedKeys = new Set();
        
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            
            if (keyMap[key] && !pressedKeys.has(key)) {
                e.preventDefault();
                pressedKeys.add(key);
                this.playNote(keyMap[key]);
                keyMap[key].classList.add('active');
            }
        });
        
        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            
            if (keyMap[key]) {
                pressedKeys.delete(key);
                this.stopNote(keyMap[key]);
                keyMap[key].classList.remove('active');
            }
        });
    }
    
    playNote(key) {
        const note = key.dataset.note;
        const frequency = parseFloat(key.dataset.freq);
        
        if (!frequency) return;
        
        // Initialize audio context if needed
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Stop existing note on this key
        this.stopNote(key);
        
        // Create oscillator and gain nodes for envelope
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        // Use triangle wave for a pleasant piano-like tone
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        // ADSR envelope
        const now = this.audioContext.currentTime;
        const attack = 0.02;
        const decay = 0.1;
        const sustain = 0.6;
        const release = 0.3;
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.5, now + attack);
        gainNode.gain.exponentialRampToValueAtTime(sustain * 0.5, now + attack + decay);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(now);
        
        // Store for later release
        this.activeOscillators.set(key, { oscillator, gainNode });
        
        // Visual feedback
        key.classList.add('active');
        this.updateStatus(`Playing: ${note} (${frequency.toFixed(2)} Hz)`);
    }
    
    stopNote(key) {
        const activeNote = this.activeOscillators.get(key);
        
        if (activeNote) {
            const { oscillator, gainNode } = activeNote;
            const now = this.audioContext.currentTime;
            const release = 0.3;
            
            // Release envelope
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + release);
            
            oscillator.stop(now + release);
            
            // Clean up after release
            setTimeout(() => {
                oscillator.disconnect();
                gainNode.disconnect();
            }, release * 1000 + 100);
            
            this.activeOscillators.delete(key);
        }
        
        // Remove visual feedback
        key.classList.remove('active');
        this.updateStatus('Ready to play!');
    }
    
    updateStatus(text) {
        this.statusText.textContent = text;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PianoApp();
});
