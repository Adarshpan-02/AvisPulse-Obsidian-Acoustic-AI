 # AvisPulse | Obsidian Acoustic AI

**AvisPulse** is a lightweight, browser-based acoustic analysis tool designed for real-time sound visualization and identification. Built with vanilla JavaScript and the Web Audio API, it features a high-performance spectrogram, decibel intensity metering, and frequency-based pattern recognition.

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Version](https://img.shields.io/badge/version-2.6.0-green.svg)

## 🚀 Features

* **Real-time Spectrogram:** Visualizes frequency density over time (waterfall plot).
* **Live Waveform:** Oscilloscope-style visualization of raw audio data.
* **Decibel Metering:** Professional `dBFS` scale with support for Infinite Silence (`-Inf`).
* **Pattern Recognition:** Identifies Human Voice, Birds, Insects, and Machinery based on spectral peak analysis.
* **Session History:** Logs every scan with timestamps, frequency data, and confidence scores.
* **Privacy First:** All processing happens **locally** in the browser. No audio is sent to any server.

## 🛠️ Tech Stack

* **Core:** HTML5, CSS3, Vanilla JavaScript (ES6+)
* **Audio Engine:** Web Audio API (`AudioContext`, `AnalyserNode`)
* **Styling:** TailwindCSS (via CDN)
* **Fonts:** JetBrains Mono (Data), Inter (UI)

## 📦 Installation & Usage

1.  **Clone or Download:**
    Simply download the `index.html` file.
2.  **Run Locally:**
    * **Important:** Modern browsers block microphone access on `file://` protocols for security.
    * You must run this on a local server (e.g., VS Code "Live Server" extension) or via HTTPS.
3.  **Upload File:**
    Click "UPLOAD FILE" to analyze existing `.wav` or `.mp3` recordings.
4.  **Live Record:**
    Click "LIVE RECORD" to use your microphone.

## 🧮 How It Works

1.  **Audio Capture:** The app captures a stream from `navigator.mediaDevices.getUserMedia`.
2.  **FFT Analysis:** An `AnalyserNode` performs a Fast Fourier Transform with an FFT size of 2048.
3.  **Heuristic Matching:** The engine calculates the Peak Frequency (Hz) and RMS Amplitude (dB). It compares these against the `ACOUSTIC_DB` lookup table to categorize the sound source.
4.  **Noise Gating:** Signals below -50dB are automatically classified as "Background Noise" to prevent false positives.

## 🤝 Contributing

Feel free to fork this project and submit pull requests. Suggested improvements:
* Add TensorFlow.js for ML-based audio classification.
* Add ability to export the history log as CSV.

---
*© 2024 AvisPulse Systems*
