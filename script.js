"use strict";

// ===================== 核心資料 =====================
const SCENES = [
  // 圖片背景
  { id: "V-01", name: "咖啡廳窗景", kind: "image", file: "cafe_scene.png" },
  { id: "V-02", name: "極簡幾何",   kind: "image", file: "geometric_scene.jpg" },
  // 影片背景（放在 /assets/videos）
  { id: "V-03", name: "森林靜景", kind: "video", file: "forest_loop.webm" },
];

// ※ 將檔案放到 ./assets/sounds/
const SOUNDS = [
  { id: "A-01", name: "Lo-Fi 專注",  file: "assets/sounds/lofi.mp3" },
  { id: "A-02", name: "雨聲白噪音",  file: "assets/sounds/rain.mp3" },
  { id: "A-03", name: "輕柔鋼琴",    file: "assets/sounds/piano.mp3" },
];

const DURATIONS = [
  { name: "25 分鐘 (專注)", duration: 25 * 60 },
  { name: "45 分鐘 (高效)", duration: 45 * 60 },
  { name: "15 分鐘 (短衝)", duration: 15 * 60 },
  { name: "5 分鐘 (測試)",  duration:  5 * 60 },
];

// ===================== 全域狀態 =====================
let isPlaying = false;
let timerInterval;
let isTimerRunning = false;
let selectedDuration = DURATIONS[0].duration;
let timeRemaining = selectedDuration;

// ===================== DOM =====================
const sceneSelect = document.getElementById("scene-select");
const soundSelect = document.getElementById("sound-select");
const currentSceneImg = document.getElementById("current-scene");
const backgroundVideo = document.getElementById("background-video");

const volumeRange = document.getElementById("volume-range");
const togglePlayButton = document.getElementById("toggle-play");
const clockDisplay = document.getElementById("clock");
const timerDisplay = document.getElementById("timer-display");
const startTimerButton = document.getElementById("start-timer");
const resetTimerButton = document.getElementById("reset-timer");
const focusDurationSelect = document.getElementById("focus-duration-select");
const localAudio = document.getElementById("local-audio");

const steamParticles = [
  document.getElementById("coffee-steam-1"),
  document.getElementById("coffee-steam-2"),
  document.getElementById("coffee-steam-3"),
];

// ===================== 小工具：淡入/淡出 =====================
function fadeShow(el) {
  if (!el) return;
  el.style.display = "";
  el.style.opacity = 0;
  // 讓瀏覽器先渲染一次，再做淡入
  requestAnimationFrame(() => { el.style.opacity = 1; });
}
function fadeHide(el) {
  if (!el) return;
  el.style.opacity = 0;
  setTimeout(() => { el.style.display = "none"; }, 300);
}

// ===================== 情境切換（圖片/影片） =====================
function handleSceneChange() {
  if (!sceneSelect) return;
  const selectedScene = SCENES.find(s => s.id === sceneSelect.value);
  if (!selectedScene) return;

  const isCafe = selectedScene.id === "V-01";
  steamParticles.forEach(p => { if (p) p.style.display = isCafe ? "block" : "none"; });

  if (selectedScene.kind === "video") {
    // 切影片背景
    if (currentSceneImg) fadeHide(currentSceneImg);

    if (backgroundVideo) {
      const src = backgroundVideo.querySelector("source");
      if (src) {
        src.src = `assets/videos/${selectedScene.file}`;
        backgroundVideo.load();
        backgroundVideo.play().catch(() => {/* 被自動播放政策擋住也沒關係 */});
      }
      fadeShow(backgroundVideo);
    }
  } else {
    // 切圖片背景
    if (backgroundVideo) fadeHide(backgroundVideo);

    if (currentSceneImg) {
      currentSceneImg.style.opacity = 0;
      setTimeout(() => {
        currentSceneImg.src = `assets/scenes/${selectedScene.file}`;
        currentSceneImg.alt = selectedScene.name;
        fadeShow(currentSceneImg);
      }, 100);
    }
  }
}

// ===================== 聲音：本機檔 =====================
function handleSoundChange() {
  if (!soundSelect || !localAudio) return;
  const selectedSound = SOUNDS.find(s => s.id === soundSelect.value);
  if (!selectedSound) return;

  localAudio.src = selectedSound.file;
  localAudio.load();
  if (isPlaying) {
    localAudio.play().catch(() => {});
  }
}

function togglePlay() {
  if (!localAudio) return;

  if (isPlaying) {
    localAudio.pause();
    isPlaying = false;
    if (togglePlayButton) togglePlayButton.textContent = "啟動音樂";
  } else {
    if (!localAudio.src) {
      const initial = soundSelect?.value || SOUNDS[0].id;
      const selectedSound = SOUNDS.find(s => s.id === initial) || SOUNDS[0];
      localAudio.src = selectedSound.file;
      localAudio.load();
    }
    localAudio.play().then(() => {
      isPlaying = true;
      if (togglePlayButton) togglePlayButton.textContent = "暫停音樂";
    }).catch(() => {
      // 等使用者互動
    });
  }
}

function handleVolumeChange() {
  if (volumeRange && localAudio) {
    const vol = Math.min(100, Math.max(0, parseInt(volumeRange.value, 10) || 0));
    localAudio.volume = vol / 100;
  }
}

// ===================== 時鐘 / 計時器 =====================
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  if (clockDisplay) clockDisplay.textContent = `${h}:${m}:${s}`;
}

function updateTimerDisplay(time) {
  const minutes = String(Math.floor(time / 60)).padStart(2, "0");
  const seconds = String(time % 60).padStart(2, "0");
  if (timerDisplay) timerDisplay.textContent = `${minutes}:${seconds}`;
}

function runTimer() {
  isTimerRunning = true;
  if (startTimerButton) { startTimerButton.textContent = "暫停"; startTimerButton.disabled = false; }
  if (resetTimerButton) resetTimerButton.disabled = false;
  if (focusDurationSelect) focusDurationSelect.disabled = true;
  if (clockDisplay) clockDisplay.style.display = "none";

  if (timeRemaining <= 0 || timeRemaining === selectedDuration) {
    const val = focusDurationSelect ? parseInt(focusDurationSelect.value, 10) : selectedDuration;
    timeRemaining = Number.isFinite(val) ? val : selectedDuration;
  }

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeRemaining = Math.max(0, timeRemaining - 1);
    updateTimerDisplay(timeRemaining);
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      alert("專注時間到！請休息一下。");
      resetTimer();
    }
  }, 1000);
}

function pauseTimer() {
  isTimerRunning = false;
  clearInterval(timerInterval);
  if (startTimerButton) startTimerButton.textContent = "繼續專注";
  if (clockDisplay) clockDisplay.style.display = "block";
}

function toggleTimer() {
  if (!focusDurationSelect) return;

  if (isTimerRunning) {
    pauseTimer();
  } else {
    selectedDuration = parseInt(focusDurationSelect.value, 10) || selectedDuration;
    if (timeRemaining <= 0 || timeRemaining === selectedDuration) {
      timeRemaining = selectedDuration;
      updateTimerDisplay(timeRemaining);
    }
    runTimer();
  }
}

function resetTimer() {
  if (!focusDurationSelect) return;
  pauseTimer();

  selectedDuration = parseInt(focusDurationSelect.value, 10) || selectedDuration;
  timeRemaining = selectedDuration;
  updateTimerDisplay(timeRemaining);

  focusDurationSelect.disabled = false;
  if (startTimerButton) { startTimerButton.textContent = "開始專注"; startTimerButton.disabled = false; }
  if (resetTimerButton) resetTimerButton.disabled = true;
  if (clockDisplay) clockDisplay.style.display = "block";
}

// ===================== 初始化 =====================
document.addEventListener("DOMContentLoaded", () => {
  // 情境選單
  SCENES.forEach(scene => {
    const option = new Option(scene.name, scene.id);
    if (sceneSelect) sceneSelect.add(option);
  });
  if (sceneSelect) sceneSelect.selectedIndex = 0;

  // 首次載入：如果預設是 video 就播影片，否則顯示圖片
  const firstScene = SCENES[0];
  if (firstScene?.kind === "video") {
    if (backgroundVideo) {
      const src = backgroundVideo.querySelector("source");
      if (src) {
        src.src = `assets/videos/${firstScene.file}`;
        backgroundVideo.load();
        backgroundVideo.play().catch(() => {});
      }
      fadeShow(backgroundVideo);
    }
  } else {
    if (currentSceneImg) {
      currentSceneImg.src = `assets/scenes/${firstScene.file}`;
      currentSceneImg.alt = firstScene.name;
      fadeShow(currentSceneImg);
    }
  }

  // 聲音選單
  SOUNDS.forEach(sound => {
    const option = new Option(sound.name, sound.id);
    if (soundSelect) soundSelect.add(option);
  });
  if (soundSelect) soundSelect.selectedIndex = 0;

  // 專注時長
  DURATIONS.forEach(item => {
    const option = new Option(item.name, item.duration);
    if (focusDurationSelect) focusDurationSelect.add(option);
  });
  if (focusDurationSelect) focusDurationSelect.value = String(DURATIONS[0].duration);

  // Audio 初始音量
  if (localAudio && volumeRange) {
    localAudio.volume = (parseInt(volumeRange.value, 10) || 50) / 100;
  }

  // 時鐘
  updateClock();
  setInterval(updateClock, 1000);

  // 計時器初始 UI
  updateTimerDisplay(selectedDuration);

  // 綁定事件
  sceneSelect?.addEventListener("change", handleSceneChange);
  soundSelect?.addEventListener("change", handleSoundChange);
  volumeRange?.addEventListener("input", handleVolumeChange);
  togglePlayButton?.addEventListener("click", togglePlay);
  startTimerButton?.addEventListener("click", toggleTimer);
  resetTimerButton?.addEventListener("click", resetTimer);
  focusDurationSelect?.addEventListener("change", resetTimer);
});
