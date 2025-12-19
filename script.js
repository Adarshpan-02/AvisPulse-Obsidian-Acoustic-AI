
        // 1. UPDATED DATABASE: More realistic ranges for microphone input
        const ACOUSTIC_DB = [
            { type: "Human", name: "Human Speech / Voice", freq: [85, 3500], info: "Vocal cords modulation with harmonics." },
            { type: "Nature", name: "Bird / High Chirp", freq: [3501, 8000], info: "Rapid pitch modulation (Passerine)." },
            { type: "Nature", name: "Thunder / Rumble", freq: [20, 84], info: "Low frequency atmospheric turbulence." },
            { type: "Insect", name: "Cricket / Cicada", freq: [8001, 16000], info: "High frequency stridulation." },
            { type: "Machinery", name: "Mechanical Hum", freq: [60, 400], info: "AC current hum or motor rotation." } // Overlaps with human, logic handles this below
        ];

        let audioCtx, analyzer, source, animationId, dataArray, startTime;
        let isRecording = false;

        const specCanvas = document.getElementById('spectrogram');
        const waveCanvas = document.getElementById('waveform');
        const sCtx = specCanvas.getContext('2d');
        const wCtx = waveCanvas.getContext('2d');
        const historyBody = document.getElementById('historyBody');

        function resize() {
            specCanvas.width = specCanvas.offsetWidth;
            specCanvas.height = 256;
            waveCanvas.width = waveCanvas.offsetWidth;
            waveCanvas.height = 100;
        }
        window.onresize = resize; resize();

        document.getElementById('recordBtn').onclick = async function() {
            if (!isRecording) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    startEngine(stream);
                    this.classList.add('record-pulse');
                    document.getElementById('recordText').innerText = "STOP SCAN";
                    document.getElementById('statusBadge').innerText = "STATUS: LISTENING";
                    document.getElementById('statusBadge').style.color = "#10b981";
                    startTime = performance.now();
                } catch (err) {
                    alert("MICROPHONE ERROR: Please use HTTPS or localhost.");
                }
            } else {
                stopEngine("LIVE_MIC");
            }
        };

        // File Upload Logic
        document.getElementById('audioUpload').onchange = async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const buffer = await audioCtx.decodeAudioData(await file.arrayBuffer());
            const offlineSource = audioCtx.createBufferSource();
            offlineSource.buffer = buffer;
            startEngine(null, offlineSource);
            offlineSource.start();
            startTime = performance.now();
            document.getElementById('statusBadge').innerText = "STATUS: ANALYZING FILE";
            setTimeout(() => stopEngine(file.name), Math.min(buffer.duration * 1000, 5000));
        };

        function startEngine(stream, offlineSource) {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyzer = audioCtx.createAnalyser();
            analyzer.fftSize = 2048; 
            source = stream ? audioCtx.createMediaStreamSource(stream) : offlineSource;
            source.connect(analyzer);
            dataArray = new Uint8Array(analyzer.frequencyBinCount);
            isRecording = true;
            render();
        }

        function stopEngine(label) {
            isRecording = false;
            cancelAnimationFrame(animationId);
            document.getElementById('recordBtn').classList.remove('record-pulse');
            document.getElementById('recordText').innerText = "LIVE RECORD";
            document.getElementById('statusBadge').innerText = "STATUS: IDLE";
            document.getElementById('statusBadge').style.color = "#71717a";
            processResults(label);
        }

        function render() {
            if (!isRecording) return;
            animationId = requestAnimationFrame(render);
            analyzer.getByteFrequencyData(dataArray);

            // Calculate RMS (Volume)
            let sum = 0;
            for(let i=0; i<dataArray.length; i++) sum += dataArray[i] * dataArray[i];
            let rms = Math.sqrt(sum / dataArray.length);
            let dbDisplay = rms > 0 ? (20 * Math.log10(rms / 255)).toFixed(1) : "-Inf";

            // Identify Peak Frequency
            const peakIdx = dataArray.indexOf(Math.max(...dataArray));
            const freq = Math.round(peakIdx * audioCtx.sampleRate / analyzer.fftSize);
            const mag = (Math.max(...dataArray) / 255) * 100;
            const time = (performance.now() - startTime) / 1000;

            // DOM Updates
            document.getElementById('statFreq').innerHTML = `${freq} <small class="text-zinc-600">Hz</small>`;
            document.getElementById('statMag').innerText = Math.round(mag) + "%";
            document.getElementById('statDbLive').innerText = dbDisplay;
            document.getElementById('statTime').innerText = time.toFixed(2) + "s";

            // Draw Waveform
            wCtx.fillStyle = '#000';
            wCtx.fillRect(0, 0, waveCanvas.width, waveCanvas.height);
            wCtx.strokeStyle = '#10b981';
            wCtx.beginPath();
            let slice = waveCanvas.width / dataArray.length;
            let x = 0;
            for(let i=0; i<dataArray.length; i++) {
                let y = (dataArray[i]/255) * waveCanvas.height;
                if(i===0) wCtx.moveTo(x,y); else wCtx.lineTo(x,y);
                x += slice;
            }
            wCtx.stroke();

            // Draw Spectrogram
            let img = sCtx.getImageData(1, 0, specCanvas.width-1, specCanvas.height);
            sCtx.putImageData(img, 0, 0);
            for(let i=0; i<dataArray.length; i++) {
                let v = dataArray[i];
                sCtx.fillStyle = `rgb(0, ${v}, ${v*0.8})`; // Green tint
                sCtx.fillRect(specCanvas.width-1, specCanvas.height - (i*0.5), 1, 1);
            }
        }

        // 2. FIXED RECOGNITION LOGIC
        function processResults(sourceLabel) {
            const freq = parseInt(document.getElementById('statFreq').innerText);
            const dbVal = parseFloat(document.getElementById('statDbLive').innerText);
            
            // Noise Gate: If sound is too quiet (< -50dB), it's just silence
            let isSilence = dbVal < -50 || document.getElementById('statDbLive').innerText === "-Inf";

            let match;
            let confidence;

            if (isSilence) {
                match = { type: "Silence", name: "Background Noise", info: "Signal below analysis threshold." };
                confidence = 100;
            } else {
                // Find match in DB
                match = ACOUSTIC_DB.find(b => freq >= b.freq[0] && freq <= b.freq[1]);
                
                // Fallback for complex sounds
                if (!match) {
                    if(freq > 8000) match = { type: "High Freq", name: "Electronic Whine", info: "Ultrasonic or electronic interference." };
                    else match = { type: "Unknown", name: "Unidentified Pattern", info: "Frequency out of standard classification." };
                }

                // Calculate Confidence based on Signal Clarity (Volume)
                // Louder signals = Higher confidence
                confidence = Math.min(98, (dbVal + 100) * 1.2).toFixed(1); 
            }

            // Update UI
            document.getElementById('matchContainer').innerHTML = `
                <div class="bg-zinc-900/40 border border-emerald-500/20 p-6 rounded-xl relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-2 opacity-20 text-[60px] text-emerald-500 font-bold leading-none select-none">
                        ${match.type.charAt(0)}
                    </div>
                    <span class="text-[9px] font-bold text-emerald-500 mono border border-emerald-500/20 px-2 py-0.5 rounded">${match.type.toUpperCase()}</span>
                    <h3 class="text-xl font-bold mt-4 z-10 relative">${match.name}</h3>
                    <p class="text-xs text-zinc-500 mt-2 font-light z-10 relative">${match.info}</p>
                    
                    <div class="mt-6 pt-4 border-t border-zinc-800">
                        <div class="flex justify-between mono text-[10px] mb-1">
                            <span class="text-zinc-500">CONFIDENCE_SCORE</span>
                            <span class="text-white">${confidence}%</span>
                        </div>
                        <div class="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                            <div class="h-full bg-emerald-500 transition-all duration-500" style="width: ${confidence}%"></div>
                        </div>
                    </div>
                </div>
            `;

            // Add to History
            const row = `
                <tr class="border-b border-zinc-900 hover:bg-zinc-900/30 transition-colors">
                    <td class="p-4 text-zinc-600">${new Date().toLocaleTimeString()}</td>
                    <td class="p-4 text-emerald-500 font-bold">${freq}Hz</td>
                    <td class="p-4 text-zinc-400">${document.getElementById('statDbLive').innerText} dB</td>
                    <td class="p-4 text-zinc-200">${match.name}</td>
                    <td class="p-4 text-white font-mono text-[10px]">${confidence}%</td>
                </tr>`;
            historyBody.insertAdjacentHTML('afterbegin', row);
        }

        document.getElementById('clearHistoryBtn').onclick = () => {
            if(confirm("Confirm: Purge history database?")) historyBody.innerHTML = '';
        };
    