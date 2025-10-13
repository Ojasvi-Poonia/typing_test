angular.module('typingApp', [])
.controller('TypingController', function($http, $interval, $sce) {
    const vm = this;

    vm.words = [];
    vm.currentWordIndex = 0;
    vm.currentChar = -1;
    vm.isTesting = false;
    vm.time = 0;
    vm.wpm = 0;
    vm.accuracy = 100;
    vm.testCompleted = false; // Track if test has been completed (one-time only)

    vm.correctChars = 0;      // for WPM calculation
    vm.totalChars = 0;        // total chars in test for WPM

    vm.totalTypedChars = 0;   // total keystrokes typed (for accuracy)
    vm.correctTypedChars = 0; // how many typed chars were correct (for accuracy)

    vm.timer = null;
    vm.showResultsModal = false;
    vm.showTeamModal = false;
    vm.teamName = '';
    vm.saveStatus = ''; // 'saving', 'success', 'error'
    vm.duration = 30; // Fixed to 30 seconds

    // Google Apps Script Web App URL (loaded from config.js)
    vm.googleScriptUrl = APP_CONFIG.googleScriptUrl;

    // Fixed paragraph for competition fairness
    const fixedParagraph = "The quick brown fox jumps over the lazy dog near the riverbank where children play and birds sing their melodious songs throughout the warm sunny afternoon while gentle breezes rustle through the leaves of ancient oak trees that have stood for generations providing shade and shelter to countless creatures both great and small in this peaceful corner of the world where time seems to slow down and worries fade away into the distance like clouds drifting across an endless sky";

    vm.showTeamNamePrompt = function() {
        vm.showTeamModal = true;
    };

    vm.handleTeamNameKeypress = function(event) {
        if (event.key === 'Enter' && vm.teamName && vm.teamName.trim() !== '') {
            vm.startTestWithTeam();
        }
    };

    vm.startTestWithTeam = function() {
        if (!vm.teamName || vm.teamName.trim() === '') {
            return;
        }
        vm.showTeamModal = false;
        vm.startTest();
    };

    vm.startTest = function() {
        // Prevent starting if test is already completed
        if (vm.testCompleted) {
            return;
        }

        vm.words = [];
        // Split fixed paragraph into words
        const paragraphWords = fixedParagraph.split(' ');
        paragraphWords.forEach(word => {
            vm.words.push({
                text: word,
                typed: '',
                status: 'pending'
            });
        });

        vm.isTesting = true;
        vm.currentWordIndex = 0;
        vm.currentChar = -1;
        vm.time = 0;
        vm.wpm = 0;
        vm.correctChars = 0;
        vm.totalChars = 0;

        vm.totalTypedChars = 0;
        vm.correctTypedChars = 0;

        vm.showResultsModal = false;

        // Count total chars for WPM calculation (including spaces between words)
        vm.words.forEach(word => vm.totalChars += word.text.length);
        vm.totalChars += vm.words.length - 1; // spaces between words count as chars

        if (vm.timer) $interval.cancel(vm.timer);
        vm.timer = $interval(() => {
            vm.time++;
            calculateWPM();
            calculateAccuracy();

            if (vm.time >= vm.duration) {
                endTest();
                showResultsPopup();
            }
        }, 1000);
    };

    vm.handleKey = function(event) {
        if (!vm.isTesting) return;

        const wordObj = vm.words[vm.currentWordIndex];
        const word = wordObj.text;

        if (event.key === "Backspace") {
            // Backspace doesn't reduce totalTypedChars or correctTypedChars - mistakes remain counted
            if (vm.currentChar >= 0) {
                wordObj.typed = wordObj.typed.slice(0, -1);
                vm.currentChar--;
            } else if (vm.currentWordIndex > 0) {
                vm.currentWordIndex--;
                const prevWord = vm.words[vm.currentWordIndex];
                vm.currentChar = prevWord.typed.length - 1;
                prevWord.status = 'pending';
                prevWord.typed = prevWord.typed.slice(0, -1);
            }
            event.preventDefault();
            return;
        }

        // Space key pressed - moves to next word (like Monkeytype)
        if (event.key === " ") {
            event.preventDefault();

            // If we haven't started typing the word yet, don't do anything
            if (wordObj.typed.length === 0) {
                return;
            }

            // Mark word as correct or incorrect
            vm.totalTypedChars++; // count space keystroke
            vm.correctTypedChars++; // space itself is always correct

            wordObj.status = wordObj.typed === word ? 'correct' : 'incorrect';
            countCorrectChars(wordObj);

            // Move to next word
            vm.currentWordIndex++;
            vm.currentChar = -1;

            if (vm.currentWordIndex >= vm.words.length) {
                endTest();
                showResultsPopup();
            }

            return;
        }

        // For normal character keys
        if (event.key.length === 1 && event.key.match(/^[a-zA-Z]$/)) {
            vm.currentChar++;
            wordObj.typed += event.key;

            // Increase total typed chars
            vm.totalTypedChars++;

            // Check if typed char matches original char at position
            if (event.key === word[vm.currentChar]) {
                vm.correctTypedChars++;
            }

            // Don't auto-advance - user must press space
        }
    };

    function countCorrectChars(wordObj) {
        for (let i = 0; i < wordObj.text.length; i++) {
            if (wordObj.typed[i] === wordObj.text[i]) {
                vm.correctChars++;
            }
        }
    }

    vm.highlightCurrentChar = function(word, index) {
        if (index > vm.currentWordIndex) return $sce.trustAsHtml(word.text);

        let html = '';
        const typed = word.typed || '';
        const original = word.text;
        const isCurrentWord = index === vm.currentWordIndex;

        // Show all characters of the word
        for (let i = 0; i < original.length; i++) {
            if (i < typed.length) {
                const typedChar = typed[i];
                const originalChar = original[i];
                const cls = typedChar === originalChar ? 'correct-char' : 'incorrect-char';
                html += `<span class="${cls}">${originalChar}</span>`;
            } else if (i === typed.length && isCurrentWord) {
                // Add cursor class to the next character to be typed
                html += `<span class="current-char">${original[i]}</span>`;
            } else {
                html += original[i];
            }
        }

        // If typed more than original (extra characters)
        if (typed.length > original.length) {
            for (let i = original.length; i < typed.length; i++) {
                const typedChar = typed[i];
                const addCursor = (i === typed.length - 1) && isCurrentWord ? ' current-char' : '';
                html += `<span class="incorrect-char${addCursor}">${typedChar}</span>`;
            }
        }

        // If we've typed all characters and still on this word, show cursor at the end
        if (typed.length === original.length && isCurrentWord) {
            html += `<span class="cursor-end"></span>`;
        }

        return $sce.trustAsHtml(html);
    };

    function calculateWPM() {
        const minutes = vm.time / 60;
        vm.wpm = Math.round((vm.correctChars / 5) / (minutes || 1));
    }

    function calculateAccuracy() {
        if (vm.totalTypedChars === 0) {
            vm.accuracy = 100;
        } else {
            vm.accuracy = Math.round((vm.correctTypedChars / vm.totalTypedChars) * 100);
        }
    }

    function endTest() {
        if (vm.timer) $interval.cancel(vm.timer);
        vm.isTesting = false;
        vm.testCompleted = true; // Mark test as completed (one-time only)
    }

    function showResultsPopup() {
        vm.showResultsModal = true;
        saveResultsToGoogleSheets();
    }

    function saveResultsToGoogleSheets() {
        vm.saveStatus = 'saving';

        const data = {
            teamName: vm.teamName,
            wpm: vm.wpm,
            accuracy: vm.accuracy,
            timestamp: new Date().toISOString()
        };

        $http.post(vm.googleScriptUrl, data)
            .then(function(response) {
                vm.saveStatus = 'success';
            })
            .catch(function(error) {
                console.error('Error saving to Google Sheets:', error);
                vm.saveStatus = 'error';
            });
    }

    vm.closeModal = function() {
        // Do not allow closing the modal - test is permanently complete
        // vm.showResultsModal = false;
    };
});
