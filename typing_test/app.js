angular.module('typingApp', [])
.controller('TypingController', function($http, $interval, $sce) {
    const vm = this;

    vm.words = [];
    vm.englishWords = [];
    vm.currentWordIndex = 0;
    vm.currentChar = -1;
    vm.isTesting = false;
    vm.time = 0;
    vm.wpm = 0;
    vm.accuracy = 100;

    vm.correctChars = 0;      // for WPM calculation
    vm.totalChars = 0;        // total chars in test for WPM

    vm.totalTypedChars = 0;   // total keystrokes typed (for accuracy)
    vm.correctTypedChars = 0; // how many typed chars were correct (for accuracy)

    vm.timer = null;
    vm.showResultsModal = false;

    // Load English words from words.json
    $http.get('words.json').then(response => {
        vm.englishWords = response.data.commonWords;
    });

    function generateRandomWord() {
        const list = vm.englishWords;
        return list.length > 0
            ? list[Math.floor(Math.random() * list.length)]
            : 'loading';
    }

    vm.startTest = function() {
        vm.words = [];
        for (let i = 0; i < 50; i++) {
            vm.words.push({
                text: generateRandomWord(),
                typed: '',
                status: 'pending'
            });
        }

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

        // Space key pressed - counts as a typed character (space char)
        if (event.key === " " && vm.currentChar >= 0) {
            vm.totalTypedChars++; // count space keystroke
            // Space char should be correct if it's a space between words
            vm.correctTypedChars++; // space is always correct at this position

            wordObj.status = wordObj.typed === word ? 'correct' : 'incorrect';

            // Count correct chars for WPM
            countCorrectChars(wordObj);

            vm.currentWordIndex++;
            vm.currentChar = -1;

            if (vm.currentWordIndex >= vm.words.length) {
                endTest();
                showResultsPopup();
            }
            event.preventDefault();
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

            // If word finished typing
            if (vm.currentChar === word.length - 1) {
                wordObj.status = wordObj.typed === word ? 'correct' : 'incorrect';
                countCorrectChars(wordObj);

                vm.currentWordIndex++;
                vm.currentChar = -1;

                if (vm.currentWordIndex >= vm.words.length) {
                    endTest();
                    showResultsPopup();
                }
            }
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

        for (let i = 0; i < original.length; i++) {
            if (i < typed.length) {
                const cls = typed[i] === original[i] ? 'correct-char' : 'incorrect-char';
                html += `<span class="${cls}">${original[i]}</span>`;
            } else if (i === typed.length && index === vm.currentWordIndex) {
                html += `<span class="current-char">${original[i]}</span>`;
            } else {
                html += original[i];
            }
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
    }

    function showResultsPopup() {
        vm.showResultsModal = true;
    }

    vm.closeModal = function() {
        vm.showResultsModal = false;
    };
});
