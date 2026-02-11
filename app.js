class PianoApp {
    constructor() {
        this.audioContext = null;
        this.activeOscillators = new Map();
        this.piano = document.getElementById('piano');
        this.statusText = document.getElementById('status-text');
        
        // Quiz mode state
        this.mode = 'free'; // 'free', 'quiz', 'scales', or 'songs'
        this.quizActive = false;
        this.targetNote = null;
        this.score = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.awaitingAnswer = false;
        
        // All available notes for quiz
        this.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        // Scales mode state
        this.scaleActive = false;
        this.scaleNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C2'];
        this.scaleIndex = 0;
        this.scaleDescending = false;
        this.scaleDirection = 'ascending'; // 'ascending' or 'descending'
        this.metronomeActive = true;
        this.metronomeInterval = null;
        this.metronomeBPM = 60;
        
        // Songs mode state
        this.songActive = false;
        this.songPaused = false;
        this.songIndex = 0;
        this.currentSong = null;
        this.songSpeed = 0.5;
        this.waitMode = true;
        this.loopSong = false;
        this.songPlaybackInterval = null;
        this.awaitingSongNote = false;
        this.fallingNotesOffset = 0;
        
        // Song library
        this.songs = {
            twinkle: {
                name: 'Twinkle Twinkle Little Star',
                notes: ['C', 'C', 'G', 'G', 'A', 'A', 'G', 'F', 'F', 'E', 'E', 'D', 'D', 'C'],
                tempo: 500 // ms per note at 100% speed
            },
            mary: {
                name: 'Mary Had a Little Lamb',
                notes: ['E', 'D', 'C', 'D', 'E', 'E', 'E', 'D', 'D', 'D', 'E', 'G', 'G'],
                tempo: 400
            },
            ode: {
                name: 'Ode to Joy',
                notes: ['E', 'E', 'F', 'G', 'G', 'F', 'E', 'D', 'C', 'C', 'D', 'E', 'E', 'D', 'D'],
                tempo: 450
            }
        };
        
        // Progress tracking
        this.progress = {
            quizScore: 0,
            scalesCompleted: 0,
            songsMastered: []
        };
        this.loadProgress();
        
        this.init();
    }
    
    init() {
        this.setupAudio();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupQuizUI();
        this.setupScalesUI();
        this.setupSongsUI();
        this.setupLessonsUI();
        this.setupOnboarding();
        this.updateProgressDisplay();
        this.checkFirstVisit();
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
        const scalesBtn = document.getElementById('scales-btn');
        const songsBtn = document.getElementById('songs-btn');
        const lessonsBtn = document.getElementById('lessons-btn');
        const quizPanel = document.getElementById('quiz-panel');
        const scalesPanel = document.getElementById('scales-panel');
        const songsPanel = document.getElementById('songs-panel');
        const lessonsPanel = document.getElementById('lessons-panel');
        
        freePlayBtn.addEventListener('click', () => {
            this.setMode('free');
            freePlayBtn.classList.add('active');
            quizBtn.classList.remove('active');
            scalesBtn.classList.remove('active');
            songsBtn.classList.remove('active');
            lessonsBtn.classList.remove('active');
            quizPanel.classList.add('hidden');
            scalesPanel.classList.add('hidden');
            songsPanel.classList.add('hidden');
            lessonsPanel.classList.add('hidden');
        });
        
        quizBtn.addEventListener('click', () => {
            this.setMode('quiz');
            quizBtn.classList.add('active');
            freePlayBtn.classList.remove('active');
            scalesBtn.classList.remove('active');
            songsBtn.classList.remove('active');
            lessonsBtn.classList.remove('active');
            quizPanel.classList.remove('hidden');
            scalesPanel.classList.add('hidden');
            songsPanel.classList.add('hidden');
            lessonsPanel.classList.add('hidden');
        });
        
        scalesBtn.addEventListener('click', () => {
            this.setMode('scales');
            scalesBtn.classList.add('active');
            freePlayBtn.classList.remove('active');
            quizBtn.classList.remove('active');
            songsBtn.classList.remove('active');
            lessonsBtn.classList.remove('active');
            quizPanel.classList.add('hidden');
            scalesPanel.classList.remove('hidden');
            songsPanel.classList.add('hidden');
            lessonsPanel.classList.add('hidden');
        });
        
        songsBtn.addEventListener('click', () => {
            this.setMode('songs');
            songsBtn.classList.add('active');
            freePlayBtn.classList.remove('active');
            quizBtn.classList.remove('active');
            scalesBtn.classList.remove('active');
            lessonsBtn.classList.remove('active');
            quizPanel.classList.add('hidden');
            scalesPanel.classList.add('hidden');
            songsPanel.classList.remove('hidden');
            lessonsPanel.classList.add('hidden');
        });
        
        lessonsBtn.addEventListener('click', () => {
            this.setMode('lessons');
            lessonsBtn.classList.add('active');
            freePlayBtn.classList.remove('active');
            quizBtn.classList.remove('active');
            scalesBtn.classList.remove('active');
            songsBtn.classList.remove('active');
            quizPanel.classList.add('hidden');
            scalesPanel.classList.add('hidden');
            songsPanel.classList.add('hidden');
            lessonsPanel.classList.remove('hidden');
            this.updateProgressDisplay();
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
    
    setupScalesUI() {
        // Scales control buttons
        const startScaleBtn = document.getElementById('start-scale-btn');
        const resetScaleBtn = document.getElementById('reset-scale-btn');
        const descendingToggle = document.getElementById('descending-toggle');
        const metronomeToggle = document.getElementById('metronome-toggle');
        
        startScaleBtn.addEventListener('click', () => {
            this.startScalePractice();
            startScaleBtn.classList.add('hidden');
            resetScaleBtn.classList.remove('hidden');
        });
        
        resetScaleBtn.addEventListener('click', () => {
            this.resetScalePractice();
            resetScaleBtn.classList.add('hidden');
            startScaleBtn.classList.remove('hidden');
        });
        
        descendingToggle.addEventListener('change', (e) => {
            this.scaleDescending = e.target.checked;
            this.scaleDirection = this.scaleDescending ? 'descending' : 'ascending';
            if (this.scaleActive) {
                this.resetScalePractice();
                this.startScalePractice();
            }
        });
        
        metronomeToggle.addEventListener('change', (e) => {
            this.metronomeActive = e.target.checked;
            if (this.scaleActive) {
                if (this.metronomeActive) {
                    this.startMetronome();
                } else {
                    this.stopMetronome();
                }
            }
        });
    }
    
    startScalePractice() {
        this.scaleActive = true;
        this.scaleIndex = this.scaleDescending ? this.scaleNotes.length - 1 : 0;
        this.updateScaleDisplay();
        this.highlightNextScaleNote();
        
        if (this.metronomeActive) {
            this.startMetronome();
        }
        
        this.updateStatus(`Scale Practice: ${this.scaleDirection} C Major`);
        this.showScalesFeedback('Play the highlighted note!');
    }
    
    resetScalePractice() {
        this.scaleActive = false;
        this.stopMetronome();
        this.scaleIndex = 0;
        this.clearScaleHighlights();
        
        const currentNoteEl = document.getElementById('current-scale-note');
        currentNoteEl.textContent = 'Press Start to begin';
        
        this.clearScalesFeedback();
        this.updateStatus('Scales Mode - Press Start to begin!');
    }
    
    checkScaleProgress(playedNote) {
        if (!this.scaleActive) return false;
        
        const targetNote = this.scaleNotes[this.scaleIndex];
        
        if (playedNote === targetNote) {
            // Correct note played
            this.highlightNote(playedNote, 'correct');
            
            // Move to next note
            if (this.scaleDescending) {
                this.scaleIndex--;
            } else {
                this.scaleIndex++;
            }
            
            // Check if scale is complete
            if (this.scaleDescending && this.scaleIndex < 0) {
                this.scaleComplete();
                return true;
            } else if (!this.scaleDescending && this.scaleIndex >= this.scaleNotes.length) {
                this.scaleComplete();
                return true;
            }
            
            // Continue to next note
            this.updateScaleDisplay();
            setTimeout(() => {
                if (this.scaleActive) {
                    this.highlightNextScaleNote();
                }
            }, 300);
            
            return true;
        } else {
            // Wrong note - flash it as incorrect
            this.highlightNote(playedNote, 'incorrect');
            this.showScalesFeedback(`That's ${playedNote}. Try ${targetNote}!`);
            return false;
        }
    }
    
    scaleComplete() {
        this.stopMetronome();
        this.showScalesFeedback('🎉 Scale Complete! Great job!');
        this.updateStatus('Scale Complete! Press Reset to practice again.');
        
        // Track progress
        this.updateProgress(null, 1, null);
        
        // Flash all keys in sequence
        this.flashScaleSuccess();
    }
    
    flashScaleSuccess() {
        const keys = this.scaleDescending ? [...this.scaleNotes].reverse() : this.scaleNotes;
        keys.forEach((note, index) => {
            setTimeout(() => {
                this.highlightNote(note, 'correct');
            }, index * 100);
        });
    }
    
    updateScaleDisplay() {
        const currentNoteEl = document.getElementById('current-scale-note');
        const targetNote = this.scaleNotes[this.scaleIndex];
        const keyEl = document.querySelector(`.key[data-note="${targetNote}"]`);
        const fingerNum = keyEl ? keyEl.dataset.finger : '';
        
        currentNoteEl.textContent = `Next: ${targetNote.replace('2', '')} (Finger ${fingerNum})`;
    }
    
    highlightNextScaleNote() {
        this.clearScaleHighlights();
        const targetNote = this.scaleNotes[this.scaleIndex];
        const key = document.querySelector(`.key[data-note="${targetNote}"]`);
        
        if (key) {
            key.classList.add('scale-target');
        }
    }
    
    clearScaleHighlights() {
        document.querySelectorAll('.key').forEach(key => {
            key.classList.remove('scale-target');
        });
    }
    
    startMetronome() {
        this.stopMetronome();
        const beatInterval = (60 / this.metronomeBPM) * 1000;
        
        this.metronomeInterval = setInterval(() => {
            this.pulseMetronome();
        }, beatInterval);
        
        // Initial pulse
        this.pulseMetronome();
    }
    
    stopMetronome() {
        if (this.metronomeInterval) {
            clearInterval(this.metronomeInterval);
            this.metronomeInterval = null;
        }
        const beatIndicator = document.getElementById('metronome-beat');
        if (beatIndicator) {
            beatIndicator.classList.remove('pulse');
        }
    }
    
    pulseMetronome() {
        const beatIndicator = document.getElementById('metronome-beat');
        if (beatIndicator) {
            beatIndicator.classList.remove('pulse');
            // Force reflow
            void beatIndicator.offsetWidth;
            beatIndicator.classList.add('pulse');
        }
    }
    
    showScalesFeedback(message) {
        const feedbackEl = document.getElementById('scales-feedback');
        feedbackEl.textContent = message;
        feedbackEl.classList.add('show');
    }
    
    clearScalesFeedback() {
        const feedbackEl = document.getElementById('scales-feedback');
        feedbackEl.classList.remove('show');
        feedbackEl.textContent = '';
    }
    
    setupSongsUI() {
        // Songs control buttons
        const startSongBtn = document.getElementById('start-song-btn');
        const pauseSongBtn = document.getElementById('pause-song-btn');
        const resetSongBtn = document.getElementById('reset-song-btn');
        const songSelect = document.getElementById('song-select');
        const speedSlider = document.getElementById('speed-slider');
        const speedValue = document.getElementById('speed-value');
        const waitModeToggle = document.getElementById('wait-mode-toggle');
        const loopToggle = document.getElementById('loop-toggle');
        
        startSongBtn.addEventListener('click', () => {
            this.startSong();
            startSongBtn.classList.add('hidden');
            pauseSongBtn.classList.remove('hidden');
            resetSongBtn.classList.remove('hidden');
        });
        
        pauseSongBtn.addEventListener('click', () => {
            if (this.songPaused) {
                this.resumeSong();
                pauseSongBtn.textContent = 'Pause';
            } else {
                this.pauseSong();
                pauseSongBtn.textContent = 'Resume';
            }
        });
        
        resetSongBtn.addEventListener('click', () => {
            this.resetSong();
            startSongBtn.classList.remove('hidden');
            pauseSongBtn.classList.add('hidden');
            resetSongBtn.classList.add('hidden');
            pauseSongBtn.textContent = 'Pause';
        });
        
        songSelect.addEventListener('change', () => {
            if (this.songActive) {
                this.resetSong();
                startSongBtn.classList.remove('hidden');
                pauseSongBtn.classList.add('hidden');
                resetSongBtn.classList.add('hidden');
                pauseSongBtn.textContent = 'Pause';
            }
            this.updateSongDisplay();
        });
        
        speedSlider.addEventListener('input', (e) => {
            this.songSpeed = parseFloat(e.target.value);
            speedValue.textContent = Math.round(this.songSpeed * 100) + '%';
            if (this.songActive && !this.songPaused) {
                this.updateSongPlaybackSpeed();
            }
        });
        
        waitModeToggle.addEventListener('change', (e) => {
            this.waitMode = e.target.checked;
        });
        
        loopToggle.addEventListener('change', (e) => {
            this.loopSong = e.target.checked;
        });
        
        // Initialize song display
        this.updateSongDisplay();
    }
    
    updateSongDisplay() {
        const songSelect = document.getElementById('song-select');
        const songKey = songSelect.value;
        const song = this.songs[songKey];
        
        const notesDisplay = document.getElementById('notes-display');
        const progressText = document.getElementById('progress-text');
        
        if (song) {
            notesDisplay.textContent = song.notes.join(' → ');
            progressText.textContent = `0 / ${song.notes.length} notes`;
        }
        
        this.updateProgressBar();
    }
    
    startSong() {
        const songSelect = document.getElementById('song-select');
        const songKey = songSelect.value;
        this.currentSong = this.songs[songKey];
        
        if (!this.currentSong) return;
        
        this.songActive = true;
        this.songPaused = false;
        this.songIndex = 0;
        this.awaitingSongNote = true;
        
        this.showSongsFeedback(`Playing: ${this.currentSong.name}`);
        this.updateStatus(`Song Mode: ${this.currentSong.name}`);
        
        this.highlightNextSongNote();
        this.updateProgressBar();
    }
    
    pauseSong() {
        this.songPaused = true;
        this.stopSongPlayback();
        this.showSongsFeedback('Paused - Press Resume to continue');
    }
    
    resumeSong() {
        this.songPaused = false;
        this.showSongsFeedback(`Playing: ${this.currentSong.name}`);
        this.highlightNextSongNote();
    }
    
    resetSong() {
        this.songActive = false;
        this.songPaused = false;
        this.songIndex = 0;
        this.awaitingSongNote = false;
        this.stopSongPlayback();
        this.clearSongHighlights();
        
        this.updateSongDisplay();
        this.clearSongsFeedback();
        this.updateStatus('Songs Mode - Select a song and press Start!');
    }
    
    checkSongProgress(playedNote) {
        if (!this.songActive || this.songPaused) return false;
        
        const targetNote = this.currentSong.notes[this.songIndex];
        
        if (playedNote === targetNote) {
            // Correct note played
            this.highlightNote(playedNote, 'correct');
            this.songIndex++;
            
            // Check if song is complete
            if (this.songIndex >= this.currentSong.notes.length) {
                this.songComplete();
                return true;
            }
            
            // Continue to next note
            this.updateProgressBar();
            this.highlightNextSongNote();
            return true;
        } else {
            // Wrong note
            if (this.waitMode) {
                // In wait mode, don't advance - flash incorrect
                this.highlightNote(playedNote, 'incorrect');
                this.showSongsFeedback(`That's ${playedNote}. Try ${targetNote}!`);
                return false;
            }
            // If not in wait mode, would auto-advance (not implemented for simplicity)
            return false;
        }
    }
    
    songComplete() {
        this.stopSongPlayback();
        this.updateProgressBar();
        
        // Track progress
        if (this.currentSong) {
            this.updateProgress(null, null, this.currentSong.name);
        }
        
        if (this.loopSong) {
            this.showSongsFeedback('🎵 Song Complete! Looping...');
            setTimeout(() => {
                this.songIndex = 0;
                this.awaitingSongNote = true;
                this.highlightNextSongNote();
                this.updateProgressBar();
            }, 1500);
        } else {
            this.showSongsFeedback('🎉 Song Complete! Great job!');
            this.updateStatus('Song Complete! Press Reset to play again.');
            
            // Flash all song notes in sequence
            this.flashSongSuccess();
            
            // Reset UI after delay
            setTimeout(() => {
                const startSongBtn = document.getElementById('start-song-btn');
                const pauseSongBtn = document.getElementById('pause-song-btn');
                const resetSongBtn = document.getElementById('reset-song-btn');
                
                startSongBtn.classList.remove('hidden');
                pauseSongBtn.classList.add('hidden');
                resetSongBtn.classList.add('hidden');
                pauseSongBtn.textContent = 'Pause';
                
                this.resetSong();
            }, 3000);
        }
    }
    
    flashSongSuccess() {
        this.currentSong.notes.forEach((note, index) => {
            setTimeout(() => {
                this.highlightNote(note, 'correct');
            }, index * 150);
        });
    }
    
    highlightNextSongNote() {
        this.clearSongHighlights();
        const targetNote = this.currentSong.notes[this.songIndex];
        const key = document.querySelector(`.key[data-note="${targetNote}"]`);
        
        if (key) {
            key.classList.add('song-target');
        }
        
        // Update falling notes display
        this.updateFallingNotes();
    }
    
    clearSongHighlights() {
        document.querySelectorAll('.key').forEach(key => {
            key.classList.remove('song-target');
        });
    }
    
    updateFallingNotes() {
        const notesDisplay = document.getElementById('notes-display');
        if (!this.currentSong || !this.songActive) return;
        
        const notes = this.currentSong.notes;
        const current = this.songIndex;
        
        // Show current note and upcoming notes
        let displayText = '';
        for (let i = 0; i < notes.length; i++) {
            if (i === current) {
                displayText += `<span class="current-note">[${notes[i]}]</span>`;
            } else if (i < current) {
                displayText += `<span class="played-note">${notes[i]}</span>`;
            } else {
                displayText += notes[i];
            }
            if (i < notes.length - 1) {
                displayText += ' → ';
            }
        }
        
        notesDisplay.innerHTML = displayText;
    }
    
    updateProgressBar() {
        if (!this.currentSong) return;
        
        const progressFill = document.getElementById('song-progress-fill');
        const progressText = document.getElementById('progress-text');
        
        const progress = (this.songIndex / this.currentSong.notes.length) * 100;
        progressFill.style.width = progress + '%';
        progressText.textContent = `${this.songIndex} / ${this.currentSong.notes.length} notes`;
    }
    
    updateSongPlaybackSpeed() {
        // In a full implementation, this would adjust timing
        // For now, it's just a visual control
    }
    
    stopSongPlayback() {
        if (this.songPlaybackInterval) {
            clearInterval(this.songPlaybackInterval);
            this.songPlaybackInterval = null;
        }
    }
    
    showSongsFeedback(message) {
        const feedbackEl = document.getElementById('songs-feedback');
        feedbackEl.innerHTML = message;
        feedbackEl.classList.add('show');
    }
    
    clearSongsFeedback() {
        const feedbackEl = document.getElementById('songs-feedback');
        feedbackEl.classList.remove('show');
        feedbackEl.textContent = '';
    }
    
    setMode(mode) {
        this.mode = mode;
        
        // Reset all mode states
        this.quizActive = false;
        this.scaleActive = false;
        this.songActive = false;
        this.stopMetronome();
        this.stopSongPlayback();
        this.clearFeedback();
        this.clearScalesFeedback();
        this.clearSongsFeedback();
        this.clearScaleHighlights();
        this.clearSongHighlights();
        
        if (mode === 'free') {
            this.updateStatus('Free Play Mode - Play any note!');
        } else if (mode === 'quiz') {
            // Reset quiz UI state
            this.targetNote = null;
            this.awaitingAnswer = false;
            
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
        } else if (mode === 'scales') {
            // Reset scales UI state
            this.scaleIndex = 0;
            
            const currentNoteEl = document.getElementById('current-scale-note');
            const startScaleBtn = document.getElementById('start-scale-btn');
            const resetScaleBtn = document.getElementById('reset-scale-btn');
            
            currentNoteEl.textContent = 'Press Start to begin';
            startScaleBtn.classList.remove('hidden');
            resetScaleBtn.classList.add('hidden');
            
            this.updateStatus('Scales Mode - Press Start to begin!');
        } else if (mode === 'songs') {
            // Reset songs UI state
            this.songIndex = 0;
            this.songPaused = false;
            
            const startSongBtn = document.getElementById('start-song-btn');
            const pauseSongBtn = document.getElementById('pause-song-btn');
            const resetSongBtn = document.getElementById('reset-song-btn');
            
            startSongBtn.classList.remove('hidden');
            pauseSongBtn.classList.add('hidden');
            resetSongBtn.classList.add('hidden');
            pauseSongBtn.textContent = 'Pause';
            
            this.updateSongDisplay();
            this.updateStatus('Songs Mode - Select a song and press Start!');
        } else if (mode === 'lessons') {
            this.updateStatus('Lessons Mode - Learn proper technique!');
            this.updateProgressDisplay();
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
            
            // Track progress every 5 correct answers
            if (this.score % 5 === 0) {
                this.updateProgress(this.score, null, null);
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
        } else if (this.mode === 'scales' && this.scaleActive) {
            // Check scale progress
            this.checkScaleProgress(note);
        } else if (this.mode === 'songs' && this.songActive) {
            // Check song progress
            this.checkSongProgress(note);
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
    
    // Lessons UI Setup
    setupLessonsUI() {
        // Lesson tab switching
        const lessonTabs = document.querySelectorAll('.lesson-tab');
        const lessonSections = document.querySelectorAll('.lesson-section');
        
        lessonTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const lessonId = tab.dataset.lesson;
                
                // Update active tab
                lessonTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Show corresponding section
                lessonSections.forEach(section => {
                    section.classList.add('hidden');
                });
                document.getElementById(`${lessonId}-lesson`).classList.remove('hidden');
            });
        });
    }
    
    // Progress tracking
    loadProgress() {
        try {
            const saved = localStorage.getItem('pianoAppProgress');
            if (saved) {
                this.progress = JSON.parse(saved);
            }
        } catch (e) {
            console.log('Could not load progress from localStorage');
        }
    }
    
    saveProgress() {
        try {
            localStorage.setItem('pianoAppProgress', JSON.stringify(this.progress));
        } catch (e) {
            console.log('Could not save progress to localStorage');
        }
    }
    
    updateProgress(quizScore, scalesCompleted, songName) {
        if (quizScore) {
            this.progress.quizScore = Math.max(this.progress.quizScore, quizScore);
        }
        if (scalesCompleted) {
            this.progress.scalesCompleted += scalesCompleted;
        }
        if (songName && !this.progress.songsMastered.includes(songName)) {
            this.progress.songsMastered.push(songName);
        }
        this.saveProgress();
        this.updateProgressDisplay();
    }
    
    updateProgressDisplay() {
        const quizProgress = document.getElementById('quiz-progress');
        const scalesProgress = document.getElementById('scales-progress');
        const songsProgress = document.getElementById('songs-progress');
        
        if (quizProgress) {
            quizProgress.textContent = `${this.progress.quizScore} notes learned`;
        }
        if (scalesProgress) {
            scalesProgress.textContent = `${this.progress.scalesCompleted} scales completed`;
        }
        if (songsProgress) {
            const count = this.progress.songsMastered.length;
            songsProgress.textContent = `${count} song${count !== 1 ? 's' : ''} mastered`;
        }
    }
    
    // Onboarding / Tutorial
    checkFirstVisit() {
        try {
            const hasVisited = localStorage.getItem('pianoAppVisited');
            if (!hasVisited) {
                this.showOnboarding();
            }
        } catch (e) {
            console.log('Could not check first visit');
        }
    }
    
    setupOnboarding() {
        const modal = document.getElementById('onboarding-modal');
        const prevBtn = document.getElementById('onboarding-prev');
        const nextBtn = document.getElementById('onboarding-next');
        const helpBtn = document.getElementById('help-btn');
        
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                this.showOnboarding();
            });
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.prevOnboardingSlide();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.nextOnboardingSlide();
            });
        }
        
        // Close on click outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideOnboarding();
                }
            });
        }
        
        // Dot navigation
        document.querySelectorAll('.dot').forEach((dot, index) => {
            dot.addEventListener('click', () => {
                this.goToSlide(index);
            });
        });
    }
    
    showOnboarding() {
        const modal = document.getElementById('onboarding-modal');
        if (modal) {
            modal.classList.add('active');
            this.currentSlide = 0;
            this.updateOnboardingUI();
        }
    }
    
    hideOnboarding() {
        const modal = document.getElementById('onboarding-modal');
        if (modal) {
            modal.classList.remove('active');
            // Mark as visited
            try {
                localStorage.setItem('pianoAppVisited', 'true');
            } catch (e) {
                console.log('Could not save visit status');
            }
        }
    }
    
    nextOnboardingSlide() {
        const slides = document.querySelectorAll('.onboarding-slide');
        if (this.currentSlide < slides.length - 1) {
            this.currentSlide++;
            this.updateOnboardingUI();
        } else {
            this.hideOnboarding();
        }
    }
    
    prevOnboardingSlide() {
        if (this.currentSlide > 0) {
            this.currentSlide--;
            this.updateOnboardingUI();
        }
    }
    
    goToSlide(index) {
        this.currentSlide = index;
        this.updateOnboardingUI();
    }
    
    updateOnboardingUI() {
        const slides = document.querySelectorAll('.onboarding-slide');
        const dots = document.querySelectorAll('.dot');
        const prevBtn = document.getElementById('onboarding-prev');
        const nextBtn = document.getElementById('onboarding-next');
        
        // Update slides
        slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === this.currentSlide);
        });
        
        // Update dots
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentSlide);
        });
        
        // Update buttons
        if (prevBtn) {
            prevBtn.disabled = this.currentSlide === 0;
            prevBtn.style.opacity = this.currentSlide === 0 ? '0.5' : '1';
        }
        
        if (nextBtn) {
            if (this.currentSlide === slides.length - 1) {
                nextBtn.textContent = 'Get Started!';
            } else {
                nextBtn.textContent = 'Next';
            }
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PianoApp();
});
