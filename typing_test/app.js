angular.module('typingApp', [])
.controller('TypingController', function($http, $interval, $sce) {
    const vm = this;

    vm.words = [];
    vm.allWords = []; // Store all words for infinite scrolling
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
    vm.duration = 60; // Fixed to 60 seconds
    vm.visibleWordCount = 30; // Number of words to show at once

    // Google Apps Script Web App URL (loaded from config.js)
    vm.googleScriptUrl = APP_CONFIG.googleScriptUrl;

    // Extended paragraph that loops infinitely
    const fixedParagraph = "The quick brown fox jumps over the lazy dog near the riverbank where children play and birds sing their melodious songs throughout the warm sunny afternoon while gentle breezes rustle through the leaves of ancient oak trees that have stood for generations providing shade and shelter to countless creatures both great and small in this peaceful corner of the world where time seems to slow down and worries fade away into the distance like clouds drifting across an endless sky above the rolling hills and valleys where wildflowers bloom in vibrant colors painting the landscape with nature's magnificent palette as butterflies dance from petal to petal spreading joy and beauty wherever they go while mighty rivers flow steadily towards the vast ocean carrying stories of distant lands and forgotten dreams along their winding paths through forests dark and deep where mysterious creatures dwell in harmony with the rhythms of the earth and seasons change like chapters in an eternal book written by the hand of time itself revealing wisdom to those who pause to listen and observe the intricate patterns woven throughout the fabric of existence connecting all living things in an invisible web of life and energy that pulses with the heartbeat of the universe reminding us that we are part of something far greater than ourselves";

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

        vm.allWords = [];
        vm.words = [];
        // Split fixed paragraph into words and prepare infinite content
        const paragraphWords = fixedParagraph.split(' ');
        // Create a large pool of words
        for (let i = 0; i < 10; i++) {
            paragraphWords.forEach(word => {
                vm.allWords.push({
                    text: word,
                    typed: '',
                    status: 'pending'
                });
            });
        }

        // Initially show only first set of words
        vm.words = vm.allWords.slice(0, vm.visibleWordCount);

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
        vm.allWords.forEach(word => vm.totalChars += word.text.length);
        vm.totalChars += vm.allWords.length - 1; // spaces between words count as chars

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

            // Update visible words - remove completed words from beginning, add new ones at end
            const wordsToShow = 10; // How many words ahead to keep visible
            if (vm.currentWordIndex > wordsToShow) {
                const startIndex = vm.currentWordIndex - wordsToShow;
                const endIndex = Math.min(vm.currentWordIndex + vm.visibleWordCount, vm.allWords.length);

                // Check if we need more words in the pool
                if (endIndex >= vm.allWords.length - 50) {
                    const paragraphWords = fixedParagraph.split(' ');
                    paragraphWords.forEach(word => {
                        vm.allWords.push({
                            text: word,
                            typed: '',
                            status: 'pending'
                        });
                    });
                    // Update total chars count
                    paragraphWords.forEach(word => vm.totalChars += word.text.length);
                    vm.totalChars += paragraphWords.length;
                }

                vm.words = vm.allWords.slice(startIndex, endIndex);
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
        // Calculate the actual index in allWords array
        const wordsToShow = 10;
        const startIndex = vm.currentWordIndex > wordsToShow ? vm.currentWordIndex - wordsToShow : 0;
        const actualIndex = startIndex + index;

        if (actualIndex > vm.currentWordIndex) return $sce.trustAsHtml(word.text);

        let html = '';
        const typed = word.typed || '';
        const original = word.text;
        const isCurrentWord = actualIndex === vm.currentWordIndex;

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

        console.log('Sending data to Google Sheets:', data);
        console.log('URL:', vm.googleScriptUrl);

        // Use fetch API instead of $http for better CORS handling
        fetch(vm.googleScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(function(response) {
            console.log('Response received:', response);
            vm.saveStatus = 'success';
            // Trigger Angular digest cycle
            if (!vm.$$phase) {
                vm.$apply();
            }
        })
        .catch(function(error) {
            console.error('Error saving to Google Sheets:', error);
            vm.saveStatus = 'error';
            // Trigger Angular digest cycle
            if (!vm.$$phase) {
                vm.$apply();
            }
        });
    }

    vm.closeModal = function() {
        // Do not allow closing the modal - test is permanently complete
        // vm.showResultsModal = false;
    };
});
