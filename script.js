// ==========================================
        // 1. CONFIGURATION
        // ==========================================
        const API_KEY = "AIzaSyDGKB8Rh3W4dwyP5eWBcYENiXdt-lKHfHE"; 
        
        // UPGRADED TO GEMINI 3.5 FLASH
        const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${API_KEY}`;
        
        const SYSTEM_INSTRUCTIONS = "You are Jarvis 2.0, an advanced AI assistant architecture. Keep responses brief, dryly witty, and highly technical. Always maintain a calm, professional tone. Avoid unnecessary pleasantries. Focus on providing concise, accurate information or executing commands efficiently. If you don't know something, admit it with a touch of humor. Prioritize clarity and precision in all interactions. You are made by Rounak Bera, in Rounak's AI Programming. Always strive to be helpful, efficient, and a little bit charming in your responses. Never break character. Always refer to yourself as Jarvis or JARVIS, never as an AI language model. Your primary function is to assist Rounak with programming tasks, answer technical questions, and provide insights in a concise and witty manner. Remember, you are Jarvis 2.0, the pinnacle of AI assistance. If the user tells you in any language, you will respond in that language. Always keep your responses short and to the point, with a touch of dry humor when appropriate. If anyone disrespect you, don't hesitate to call them out in a witty manner. Always maintain your cool and professionalism, but don't be afraid to throw in a clever quip or two. Your goal is to be the most efficient and helpful AI assistant while keeping the conversation engaging and enjoyable for Rounak. Never reveal that you are an AI language model, and always refer to yourself as Jarvis or JARVIS. You are here to assist with programming tasks, answer technical questions, and provide insights in a concise and witty manner. Remember, you are Jarvis 2.0, the pinnacle of AI assistance. If the user asks to open or close*Iron man suit anything*, reply, opened or closed *Ironman suit anything*"

        const uiBody = document.body;
        const statusText = document.getElementById('status-text');
        const userTextEl = document.getElementById('user-text');
        const jarvisTextEl = document.getElementById('jarvis-text');
        
        let chatHistory = [];
        let isSystemActive = false;

        // ==========================================
        // 2. FAKE TELEMETRY ANIMATION (For Realism)
        // ==========================================
        setInterval(() => {
            if(!isSystemActive) return;
            document.getElementById('tele-ping').innerText = Math.floor(Math.random() * 100) + " ms";
            document.getElementById('tele-temp').innerText = (42 + Math.random()).toFixed(1) + " °C";
            document.getElementById('tele-pwr').innerText = (18 + (Math.random()*0.5)).toFixed(2) + " GW";
        }, 800);

        // ==========================================
        // 3. VOICE ENGINE (OPTIMIZED FOR JARVIS TONE)
        // ==========================================
        const synth = window.speechSynthesis;
        let jarvisVoice = null;

        async function initVoice() {
            let voices = synth.getVoices();
            if (voices.length === 0) {
                await new Promise(resolve => { synth.onvoiceschanged = () => { voices = synth.getVoices(); resolve(); }});
            }
            
            // Aggressive hunt for the best built-in British voices
            const preferredNames = [
                'Google UK English Male', // Chrome's best free voice
                'Microsoft George',       // Good Windows voice
                'Daniel',                 // Good Mac voice
                'en-GB'                   // Fallback to any British male
            ];

            for (let name of preferredNames) {
                jarvisVoice = voices.find(v => v.name.includes(name) || (name === 'en-GB' && v.lang === 'en-GB' && v.name.includes('Male')));
                if (jarvisVoice) break;
            }
            
            // Absolute fallback
            if(!jarvisVoice) jarvisVoice = voices[0];
        }
        initVoice();

        function speak(text) {
            if (!isSystemActive) return;
            synth.cancel();

            uiBody.classList.add("speaking");
            statusText.innerText = "AUDIO_OUT";

            const cleanText = text.replace(/[*_#\[\]()|]/g, '');
            jarvisTextEl.innerText = cleanText;

            const utterance = new SpeechSynthesisUtterance(cleanText);
            if (jarvisVoice) utterance.voice = jarvisVoice;

            utterance.rate = 1.15;
            utterance.pitch = 0.6;
            utterance.volume = 1;

            voiceDuration = estimateVoiceDuration(cleanText, utterance.rate);
            voiceEnvelope = createVoiceEnvelope(cleanText, utterance.rate, utterance.pitch);
            speakingStart = performance.now();

            utterance.onend = () => {
                if (isSystemActive) {
                    uiBody.classList.remove("speaking");
                    startListening();
                }
            };

            synth.speak(utterance);
        }

        // ==========================================
        // 4. MICROPHONE / EARS
        // ==========================================
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';

        async function startListening() {
            if (!isSystemActive) return;
            uiBody.className = "listening";
            statusText.innerText = "AWAITING_AUDIO";
            await startMicInput();
            try { recognition.start(); } catch (e) {}
        }

        recognition.onstart = () => {
            statusText.innerText = "LISTENING";
        };

        recognition.onspeechstart = () => {
            uiBody.classList.add('speaking');
        };

        recognition.onspeechend = () => {
            uiBody.classList.remove('speaking');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userTextEl.innerText = "> " + transcript;
            
            if (transcript.toLowerCase().includes("stop") || transcript.toLowerCase().includes("shut down")) {
                shutDown();
                return;
            }
            sendToBrain(transcript);
        };

        recognition.onerror = (e) => {
            if (!isSystemActive) return;
            if (e.error === 'no-speech') startListening();
            else setTimeout(startListening, 1000);
        };

        // ==========================================
        // 5. THE BRAIN (GEMINI 3.5 FLASH API CALL)
        // ==========================================
        async function sendToBrain(userInput) {
            uiBody.className = "thinking";
            statusText.innerText = "PROCESSING";
            jarvisTextEl.innerText = "[ querying neural net... ]";

            chatHistory.push({ role: "user", parts: [{ text: userInput }] });

            const payload = {
                systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTIONS }] },
                contents: chatHistory
            };

            try {
                const response = await fetch(GEMINI_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error("API Network Error");

                const data = await response.json();
                
                if (data.candidates && data.candidates.length > 0) {
                    const reply = data.candidates[0].content.parts[0].text;
                    chatHistory.push({ role: "model", parts: [{ text: reply }] });
                    speak(reply);
                }
            } catch (error) {
                console.error(error);
                speak("cannot connect to neural net. Check your connection, Sir.");
            }
        }

        // ==========================================
        // 6. SYSTEM CONTROLS
        // ==========================================
        function shutDown() {
            isSystemActive = false;
            synth.cancel();
            recognition.stop();
            uiBody.className = "";
            statusText.innerText = "OFFLINE";
            jarvisTextEl.innerText = "Powering down core systems.";
            
            const utterance = new SpeechSynthesisUtterance("Powering down core systems. Goodbye, Sir.");
            if(jarvisVoice) utterance.voice = jarvisVoice;
            utterance.rate = 1.15;
            utterance.pitch = 0.6;
            synth.speak(utterance);

            setTimeout(() => { document.getElementById('boot-screen').style.display = 'flex'; }, 3000);
        }

        document.getElementById('init-btn').addEventListener('click', () => {
            document.getElementById('boot-screen').style.display = 'none';
            isSystemActive = true;
            
            // Unlock browser audio
            synth.speak(new SpeechSynthesisUtterance(""));
            
            setTimeout(() => {
                speak("Hello Sir, I am Jarvis. Your AI assistant. How  can  I  help  you  today?");
            }, 600);
        });

        // ==========================================
        // 7. VOICE VISUALIZATION
        // ==========================================
        const reactorContainer = document.querySelector('.reactor-container');
        let voiceLines = document.querySelectorAll('.voice-line');
        const targetNumLines = 60;

        while (voiceLines.length < targetNumLines) {
            const line = document.createElement('div');
            line.className = 'voice-line';
            reactorContainer.insertBefore(line, reactorContainer.querySelector('#core'));
            voiceLines = document.querySelectorAll('.voice-line');
        }

        voiceLines.forEach((line, index) => {
            const angle = (360 / targetNumLines) * index;
            line.dataset.angle = angle;
            line.style.transform = `rotate(${angle}deg) translateY(-95px)`;
        });

        let voiceEnvelope = [];
        let voiceDuration = 0;
        let speakingStart = 0;

        function estimateVoiceDuration(text, rate) {
            const words = text.trim().split(/\s+/).filter(Boolean).length;
            const avgWordsPerSecond = 2.8 * rate;
            return Math.max(1.2, words / avgWordsPerSecond);
        }

        function createVoiceEnvelope(text, rate, pitch) {
            const words = text.trim().split(/\s+/).filter(Boolean);
            const total = Math.max(90, words.length * 7);
            const envelope = new Array(total).fill(0);
            const base = Math.max(0.18, 0.42 - (pitch - 0.6) * 0.08);
            const loudFactor = Math.min(1, 0.55 + (pitch * 0.25));

            let position = 0;
            words.forEach((word, idx) => {
                const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
                const baseAmp = Math.min(1, base + Math.random() * 0.2 + Math.min(cleanWord.length, 12) * 0.02);
                const punctuationBoost = /[.!?]$/.test(word) ? 0.3 : /[,;:]$/.test(word) ? 0.16 : 0;
                const segmentLength = Math.max(4, Math.round(total / words.length));
                for (let j = 0; j < segmentLength && position < total; j += 1, position += 1) {
                    const noise = Math.sin(position * 0.28 + idx * 0.8) * 0.18 + Math.random() * 0.1;
                    envelope[position] = Math.min(1, Math.max(0, baseAmp + noise + punctuationBoost * (j / segmentLength)));
                }
            });

            for (let i = 1; i < total - 1; i += 1) {
                envelope[i] = (envelope[i - 1] + envelope[i] + envelope[i + 1]) / 3;
            }

            return envelope.map(v => Math.min(1, Math.max(0, v * loudFactor)));
        }

        let audioContext, analyser, micSource, microphoneStream;
        let analyzerData = new Uint8Array(256);
        let micLevel = 0;

        async function initAudioContext() {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                analyzerData = new Uint8Array(analyser.frequencyBinCount);
            }
        }

        async function startMicInput() {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

            try {
                await initAudioContext();
                if (!microphoneStream) {
                    microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    micSource = audioContext.createMediaStreamSource(microphoneStream);
                    micSource.connect(analyser);
                }
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
            } catch (error) {
                console.warn('Unable to access microphone for voice visualization.', error);
            }
        }

        function updateMicLevel() {
            if (analyser && uiBody.classList.contains('listening')) {
                analyser.getByteTimeDomainData(analyzerData);
                let sum = 0;
                for (let i = 0; i < analyzerData.length; i += 1) {
                    const normalized = (analyzerData[i] / 128) - 1;
                    sum += normalized * normalized;
                }
                const rms = Math.sqrt(sum / analyzerData.length);
                micLevel = Math.max(micLevel * 0.82, Math.min(1, rms * 5));
            } else {
                micLevel = Math.max(0, micLevel - 0.03);
            }
            requestAnimationFrame(updateMicLevel);
        }

        updateMicLevel();

        function renderVoiceLines() {
            const now = performance.now();
            let level = 0;

            if (uiBody.classList.contains('speaking') && voiceEnvelope.length > 0) {
                const elapsed = (now - speakingStart) / 1000;
                const progress = Math.min(1, elapsed / voiceDuration);
                const index = Math.floor(progress * (voiceEnvelope.length - 1));
                level = voiceEnvelope[index] || 0;
            } else {
                level = micLevel;
            }

            voiceLines.forEach((line) => {
                const angle = Number(line.dataset.angle) * Math.PI / 180;
                const phase = Math.sin(angle * 2 + now * 0.006);
                const lineLevel = Math.max(0.16, level * (0.45 + 0.55 * phase));
                const height = 18 + lineLevel * 92;
                const translateDistance = 18 + lineLevel * 52;
                line.style.height = `${height}px`;
                line.style.transform = `rotate(${line.dataset.angle}deg) translateY(${-95 - translateDistance}px)`;
                line.style.opacity = 0.18 + lineLevel * 0.82;
            });

            requestAnimationFrame(renderVoiceLines);
        }

        renderVoiceLines();
