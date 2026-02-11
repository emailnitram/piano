class PianoApp {
    constructor() {
        this.audioContext = null;
        this.activeOscillators = new Map();
        this.piano = document.getElementById('piano');
        this.statusText = document.getElementById('status-text');
        
        // Quiz mode state
        this.mode = 'free'; // 'free' or 'quiz'
        this.quizActive = false;
        this.targetNote = null;
        this.score = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.awaitingAnswer = false;
        
        // All available notes for quiz
        this.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        this.init();
    }
    
    init() {
        this.setupAudio();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupQuizUI();
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
    
    setupQuizUI() {
        // Mode toggle buttons
        const freePlayBtn = document.getElementById('free-play-btn');
        const quizBtn = document.getElementById('quiz-btn');
        const quizPanel = document.getElementById('quiz-panel');
        
        freePlayBtn.addEventListener('click', () => {
            this.setMode('free');
            freePlayBtn.classList.add('active');
            quizBtn.classList.remove('active');
            quizPanel.classList.add('hidden');
        });
        
        quizBtn.addEventListener('click', () => {
            this.setMode('quiz');
            quizBtn.classList.add('active');
            freePlayBtn.classList.remove('active');
            quizPanel.classList.remove('hidden');
        });
        
        // Quiz control buttons
        const startQuizBtn = document.getElementById('start-quiz-btn');
        const nextNoteBtn = document.getElementById('next-note-btn');
        
        startQuizBtn.addEventListener('click', () => {
            this.startQuiz();
            startQuizBtn.classList.add('hidden');
            nextNoteBtn.classList.remove('hidden');
        });
        
        nextNoteBtn.addEventListener('click', () => {
            this.nextQuizNote();
        });
    }
    
    setMode(mode) {
        this.mode = mode;
        if (mode === 'free') {
            this.quizActive = false;
            this.clearFeedback();
            this.updateStatus('Free Play Mode - Play any note!');
        } else {
            // Entering quiz mode - reset quiz UI state
            this.quizActive = false;
            this.targetNote = null;
            this.awaitingAnswer = false;
            this.clearFeedback();
            
            // Reset UI to initial state
            const targetNoteEl = document.getElementById('target-note');
            const noteHintEl = document.getElementById('note-hint');
            const startQuizBtn = document.getElementById('start-quiz-btn');
            const nextNoteBtn = document.getElementById('next-note-btn');
            
            targetNoteEl.textContent = '?';
            targetNoteEl.classList.remove('correct', 'incorrect');
            noteHintEl.textContent = '';
            startQuizBtn.classList.remove('hidden');
            nextNoteBtn.classList.add('hidden');
            
            this.updateStatus('Quiz Mode - Press Start to begin!');
        }
    }
    
    startQuiz() {
        this.quizActive = true;
        this.score = 0;
        this.streak = 0;
        this.updateStats();
        this.nextQuizNote();
    }
    
    nextQuizNote() {
        // Pick a random note
        const randomIndex = Math.floor(Math.random() * this.notes.length);
        this.targetNote = this.notes[randomIndex];
        this.awaitingAnswer = true;
        
        // Update display
        const targetNoteEl = document.getElementById('target-note');
        const noteHintEl = document.getElementById('note-hint');
        targetNoteEl.textContent = this.targetNote;
        targetNoteEl.classList.remove('correct', 'incorrect');
        
        // Show keyboard hint
        const keyEl = document.querySelector(`.key[data-note="${this.targetNote}"]`);
        if (keyEl) {
            const keyLabel = keyEl.querySelector('.key-label').textContent;
            noteHintEl.textContent = `Press '${keyLabel}' on keyboard`;
        }
        
        this.clearFeedback();
        this.updateStatus(`Quiz: Play ${this.targetNote}`);
        
        // Highlight the target note briefly
        this.highlightNote(this.targetNote, 'target');
    }
    
    highlightNote(noteName, type) {
        const key = document.querySelector(`.key[data-note="${noteName}"]`);
        if (key) {
            key.classList.add(`highlight-${type}`);
            setTimeout(() => {
                key.classList.remove(`highlight-${type}`);
            }, 500);
        }
    }
    
    checkQuizAnswer(playedNote) {
        if (!this.awaitingAnswer) return;
        
        const targetNoteEl = document.getElementById('target-note');
        
        if (playedNote === this.targetNote) {
            // Correct!
            this.score++;
            this.streak++;
            if (this.streak > this.bestStreak) {
                this.bestStreak = this.streak;
            }
            
            targetNoteEl.classList.add('correct');
            this.showFeedback('Correct! 🎉', 'correct');
            this.highlightNote(playedNote, 'correct');
            this.awaitingAnswer = false;
            
            // Auto advance after delay
            setTimeout(() => {
                if (this.quizActive) {
                    this.nextQuizNote();
                }
            }, 1500);
        } else {
            // Incorrect
            this.streak = 0;
            targetNoteEl.classList.add('incorrect');
            this.showFeedback(`That's ${playedNote}, not ${this.targetNote}`, 'incorrect');
            this.highlightNote(playedNote, 'incorrect');
            
            // Remove incorrect styling after delay
            setTimeout(() => {
                targetNoteEl.classList.remove('incorrect');
            }, 1000);
        }
        
        this.updateStats();
    }
    
    showFeedback(message, type) {
        const feedbackEl = document.getElementById('feedback');
        feedbackEl.textContent = message;
        feedbackEl.className = `feedback ${type}`;
        feedbackEl.classList.add('show');
    }
    
    clearFeedback() {
        const feedbackEl = document.getElementById('feedback');
        feedbackEl.classList.remove('show', 'correct', 'incorrect');
        feedbackEl.textContent = '';
    }
    
    updateStats() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('streak').textContent = this.streak;
        document.getElementById('best-streak').textContent = this.bestStreak;
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
        
        // Visual feedback - add wave animation
        key.classList.add('active', 'playing');
        
        // Check quiz answer if in quiz mode
        if (this.mode === 'quiz' && this.quizActive) {
            this.checkQuizAnswer(note);
        } else {
            this.updateStatus(`Playing: ${note} (${frequency.toFixed(2)} Hz)`);
        }
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
        key.classList.remove('active', 'playing');
        
        if (this.mode === 'free') {
            this.updateStatus('Ready to play!');
        }
    }
    
    updateStatus(text) {
        this.statusText.textContent = text;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PianoApp();
});
