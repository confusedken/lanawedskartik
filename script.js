// ---------- SITE BACKGROUND MUSIC + AUDIO PREF DIALOG ----------
const AUDIO_PREF_KEY = "lk-wedding-audio-pref";
const AUDIO_PROMPTED_KEY = "lk-wedding-audio-prompted";
const AUDIO_STATE_KEY = "lk-wedding-audio-state";
const SITE_MUSIC_SRC = "seetha-kalyanam.mp3";

const SOUND_BTN_SVG = `
  <svg class="sound-icon sound-icon-muted" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M16.5 12A4.5 4.5 0 0 0 14 8.03v2.21l2.45 2.45c.03-.2.05-.41.05-.69zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-2.76-1.28-5.22-3.29-6.82l-1.5 1.5A6.5 6.5 0 0 1 19 12zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/>
  </svg>
  <svg class="sound-icon sound-icon-unmuted" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
  </svg>`;

let siteMusic = null;
let siteMusicBtn = null;
let audioPrefDialog = null;
let audioPrefResolver = null;
let audioPersistenceWired = false;
let pausedByBackground = false;

function getAudioPref() {
  return localStorage.getItem(AUDIO_PREF_KEY);
}

function setAudioPref(value) {
  localStorage.setItem(AUDIO_PREF_KEY, value);
}

function getAudioState() {
  try {
    const raw = sessionStorage.getItem(AUDIO_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveAudioState() {
  const audio = siteMusic || document.getElementById("siteMusic");
  if (!audio) return;

  const shouldTrack = getAudioPref() === "on";
  sessionStorage.setItem(AUDIO_STATE_KEY, JSON.stringify({
    playing: shouldTrack && !audio.paused,
    // Keep wall-clock resume from advancing while we were background-paused.
    pausedByBackground: Boolean(pausedByBackground),
    currentTime: audio.currentTime || 0,
    savedAt: Date.now(),
  }));
}

function getResumeTime(state, duration) {
  if (!state || typeof state.currentTime !== "number") return 0;

  let time = state.currentTime;
  // Only advance for time spent truly playing in the foreground.
  if (state.playing && !state.pausedByBackground && state.savedAt) {
    time += (Date.now() - state.savedAt) / 1000;
  }

  if (duration && Number.isFinite(duration) && duration > 0) {
    time %= duration;
  }

  return Math.max(0, time);
}

function shouldResumeMusic() {
  if (getAudioPref() !== "on") return false;
  const state = getAudioState();
  if (!state) return false;
  return (
    state.playing === true ||
    state.pausedByBackground === true ||
    (typeof state.currentTime === "number" && state.currentTime > 0)
  );
}

function pauseMusicForBackground() {
  const audio = ensureSiteMusic();
  if (getAudioPref() !== "on") return;
  if (!audio || audio.paused) return;

  pausedByBackground = true;
  audio.pause();
  // Keep preference "on" so we can resume when the tab returns.
  saveAudioState();
}

async function resumeMusicForForeground() {
  if (getAudioPref() !== "on") {
    pausedByBackground = false;
    return;
  }
  if (document.visibilityState !== "visible") return;

  const shouldResume = pausedByBackground || shouldResumeMusic();
  pausedByBackground = false;
  if (!shouldResume) return;

  await resumeSiteMusic();
}

function wireAudioPersistence() {
  if (audioPersistenceWired) return;
  audioPersistenceWired = true;

  const audio = ensureSiteMusic();
  let lastSave = 0;

  audio.addEventListener("play", () => {
    pausedByBackground = false;
    saveAudioState();
  });
  audio.addEventListener("timeupdate", () => {
    if (audio.paused) return;
    const now = Date.now();
    if (now - lastSave > 400) {
      lastSave = now;
      saveAudioState();
    }
  });

  window.addEventListener("pagehide", () => {
    pauseMusicForBackground();
    saveAudioState();
  });
  window.addEventListener("beforeunload", saveAudioState);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      pauseMusicForBackground();
    } else {
      resumeMusicForForeground();
    }
  });
  window.addEventListener("pageshow", () => {
    resumeMusicForForeground();
  });
  window.addEventListener("focus", () => {
    resumeMusicForForeground();
  });
  window.addEventListener("blur", () => {
    // Cover cases where iOS doesn't fire visibilitychange promptly.
    if (document.visibilityState === "hidden") {
      pauseMusicForBackground();
    }
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;
    const href = link.getAttribute("href") || "";
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    if (/^https?:\/\//i.test(href) && !href.includes(location.host)) return;
    saveAudioState();
  }, true);
}

function ensureSiteMusic() {
  if (siteMusic) return siteMusic;

  siteMusic = document.getElementById("siteMusic");
  if (!siteMusic) {
    siteMusic = document.createElement("audio");
    siteMusic.id = "siteMusic";
    siteMusic.src = SITE_MUSIC_SRC;
    siteMusic.loop = true;
    siteMusic.preload = "auto";
    document.body.appendChild(siteMusic);
  }

  wireAudioPersistence();
  return siteMusic;
}

function updateSiteMusicButton(isMuted) {
  if (!siteMusicBtn) return;
  siteMusicBtn.setAttribute("aria-pressed", String(isMuted));
  siteMusicBtn.setAttribute(
    "aria-label",
    isMuted ? "Unmute background music" : "Mute background music"
  );
  siteMusicBtn.classList.toggle("is-unmuted", !isMuted);
}

function ensureSiteMusicButton() {
  if (siteMusicBtn) {
    mountSiteMusicButtonInNav();
    return siteMusicBtn;
  }

  siteMusicBtn = document.getElementById("siteMusicBtn");
  if (siteMusicBtn) {
    mountSiteMusicButtonInNav();
    return siteMusicBtn;
  }

  siteMusicBtn = document.createElement("button");
  siteMusicBtn.type = "button";
  siteMusicBtn.id = "siteMusicBtn";
  siteMusicBtn.className = "site-music-btn is-hidden";
  siteMusicBtn.setAttribute("aria-label", "Unmute background music");
  siteMusicBtn.setAttribute("aria-pressed", "true");
  siteMusicBtn.innerHTML = SOUND_BTN_SVG;
  siteMusicBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSiteMusic();
  });
  mountSiteMusicButtonInNav();
  return siteMusicBtn;
}

function mountSiteMusicButtonInNav() {
  if (!siteMusicBtn) return;

  if (isMobileView()) {
    siteMusicBtn.classList.add("mobile-float-action");
    if (siteMusicBtn.parentElement !== document.body) {
      document.body.appendChild(siteMusicBtn);
    }
    return;
  }

  siteMusicBtn.classList.remove("mobile-float-action");
  const nav = document.querySelector(".site-nav");
  if (!nav) return;

  let end = nav.querySelector(".site-nav-end");
  if (!end) {
    end = document.createElement("div");
    end.className = "site-nav-end";
    const toggle = nav.querySelector(".nav-toggle");
    if (toggle) {
      nav.insertBefore(end, toggle);
      end.appendChild(siteMusicBtn);
      end.appendChild(toggle);
    } else {
      end.appendChild(siteMusicBtn);
      nav.appendChild(end);
    }
    return;
  }

  if (!end.contains(siteMusicBtn)) {
    end.insertBefore(siteMusicBtn, end.firstChild);
  }
}

function setSiteMusicButtonVisible(visible) {
  ensureSiteMusicButton();
  siteMusicBtn.classList.toggle("is-hidden", !visible);
}

async function applySavedPlaybackPosition(audio) {
  const state = getAudioState();
  if (!state || typeof state.currentTime !== "number") return;

  const setTime = () => {
    const resumeAt = getResumeTime(state, audio.duration);
    if (Number.isFinite(resumeAt) && resumeAt >= 0) {
      audio.currentTime = resumeAt;
    }
  };

  if (audio.readyState >= 1) {
    setTime();
    return;
  }

  await new Promise((resolve) => {
    audio.addEventListener("loadedmetadata", resolve, { once: true });
  });
  setTime();
}

async function resumeSiteMusic() {
  const audio = ensureSiteMusic();
  audio.muted = false;
  audio.volume = 0.85;

  await applySavedPlaybackPosition(audio);

  try {
    await audio.play();
    updateSiteMusicButton(false);
    saveAudioState();
    return true;
  } catch (err) {
    console.log("Could not resume site music:", err);
    updateSiteMusicButton(true);
    return false;
  }
}

async function startSiteMusic({ fresh = false } = {}) {
  if (!fresh && shouldResumeMusic()) {
    return resumeSiteMusic();
  }

  const audio = ensureSiteMusic();
  audio.muted = false;
  audio.volume = 0.85;

  try {
    await audio.play();
    updateSiteMusicButton(false);
    setAudioPref("on");
    saveAudioState();
    return true;
  } catch (err) {
    console.log("Could not start site music:", err);
    updateSiteMusicButton(true);
    return false;
  }
}

function pauseSiteMusic() {
  const audio = ensureSiteMusic();
  pausedByBackground = false;
  audio.pause();
  updateSiteMusicButton(true);
  setAudioPref("off");
  saveAudioState();
}

function toggleSiteMusic() {
  const audio = ensureSiteMusic();
  if (audio.paused) {
    startSiteMusic();
  } else {
    pauseSiteMusic();
  }
}

function isInternalNavLink(href) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (/^https?:\/\//i.test(href)) return href.includes(location.host);
  return /\.html($|[?#])/i.test(href) || href.endsWith(".html") || !href.includes(".");
}


function setActiveNavFromUrl(url) {
  const navMount = document.getElementById("site-nav-mount");
  const current = url.pathname.split("/").pop() || "index.html";
  const onHome = current === "index.html" && (!url.hash || url.hash === "#main");

  if (!navMount) return;

  navMount.querySelectorAll(".nav-links a").forEach((link) => {
    const linkPage = (link.getAttribute("href") || "").split("#")[0] || "index.html";
    const isHomeLink = linkPage === "index.html";
    link.classList.toggle("active", (onHome && isHomeLink) || (!onHome && linkPage === current));
  });
}

function isMobileView() {
  return window.matchMedia("(max-width: 768px)").matches;
}

function wireMobileMusicButtonPlacement() {
  mountSiteMusicButtonInNav();
  window.addEventListener("resize", () => {
    mountSiteMusicButtonInNav();
  });
}

function swapSiteContent(doc) {
  const site = document.querySelector(".site");
  const footerMount = document.getElementById("site-footer-mount");
  const incomingSite = doc.querySelector(".site");
  if (!site || !incomingSite || !footerMount) return false;

  site.className = incomingSite.className;

  [...site.children].forEach((child) => {
    if (child.id === "site-nav-mount" || child.id === "site-footer-mount") return;
    child.remove();
  });

  const splash = document.getElementById("splash");
  if (splash) {
    splash.classList.add("hidden");
    document.documentElement.classList.remove("splash-active");
    document.body.style.overflow = "";
  }

  [...incomingSite.children].forEach((child) => {
    if (child.id === "site-nav-mount" || child.id === "site-footer-mount") return;
    site.insertBefore(child.cloneNode(true), footerMount);
  });

  return true;
}

async function applyFetchedPage(doc, url, { updateHistory = null } = {}) {
  if (!swapSiteContent(doc)) throw new Error("Could not swap page content");

  document.title = doc.title;
  if (updateHistory === "push") {
    history.pushState({ softNav: true }, "", url.pathname + url.hash);
  } else if (updateHistory === "replace") {
    history.replaceState({ softNav: true }, "", url.pathname + url.hash);
  }

  window.scrollTo(0, 0);
  setActiveNavFromUrl(url);
  setSiteMusicButtonVisible(true);
  mountSiteMusicButtonInNav();
  document.getElementById("navLinks")?.classList.remove("open");
  document.dispatchEvent(new CustomEvent("wedding:soft-nav"));
}

async function softNavigate(href, { updateHistory = "push" } = {}) {
  const url = new URL(href, location.href);

  try {
    const res = await fetch(url.pathname + url.search, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    await applyFetchedPage(doc, url, { updateHistory });
  } catch (err) {
    console.log("Soft navigation failed, falling back to full load:", err);
    saveAudioState();
    location.href = href;
  }
}

function shouldUseSoftNav() {
  return getAudioPref() === "on";
}

function wireSoftNavForMusic() {
  document.addEventListener("click", (event) => {
    if (!shouldUseSoftNav()) return;

    const link = event.target.closest("a[href]");
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

    const href = link.getAttribute("href") || "";
    if (!isInternalNavLink(href)) return;

    event.preventDefault();
    softNavigate(href);
  }, true);

  window.addEventListener("popstate", () => {
    if (!shouldUseSoftNav()) return;
    softNavigate(location.pathname + location.search + location.hash, { updateHistory: null });
  });
}

function ensureAudioPrefDialog() {
  if (audioPrefDialog) return audioPrefDialog;

  audioPrefDialog = document.createElement("div");
  audioPrefDialog.id = "audioPrefDialog";
  audioPrefDialog.className = "audio-pref-dialog";
  audioPrefDialog.setAttribute("role", "dialog");
  audioPrefDialog.setAttribute("aria-modal", "true");
  audioPrefDialog.setAttribute("aria-labelledby", "audioPrefTitle");
  audioPrefDialog.innerHTML = `
    <div class="audio-pref-backdrop"></div>
    <div class="audio-pref-card">
      <div class="audio-pref-ornament"><img src="welcome_bar.png" alt=""></div>
      <h2 id="audioPrefTitle">Audio Experience</h2>
      <p>Would you like to enjoy an audio experience as you explore our wedding site?</p>
      <div class="audio-pref-actions">
        <button type="button" class="audio-pref-btn audio-pref-btn-primary" id="audioPrefUnmute">Play with Music</button>
        <button type="button" class="audio-pref-btn audio-pref-btn-secondary" id="audioPrefMute">Continue Muted</button>
      </div>
    </div>`;

  const finishChoice = (choice) => {
    const resolve = audioPrefResolver;
    audioPrefResolver = null;
    hideAudioPrefDialog();
    if (resolve) resolve(choice);
  };

  audioPrefDialog.querySelector("#audioPrefUnmute").addEventListener("click", () => {
    finishChoice("on");
  });
  audioPrefDialog.querySelector("#audioPrefMute").addEventListener("click", () => {
    finishChoice("off");
  });

  document.body.appendChild(audioPrefDialog);
  return audioPrefDialog;
}

function showAudioPrefDialog() {
  return new Promise((resolve) => {
    ensureAudioPrefDialog();
    audioPrefResolver = resolve;
    audioPrefDialog.classList.add("is-visible");
    document.body.style.overflow = "hidden";
    audioPrefDialog.querySelector("#audioPrefUnmute").focus();
  });
}

function hideAudioPrefDialog() {
  if (!audioPrefDialog) return;
  audioPrefDialog.classList.remove("is-visible");
  const splash = document.getElementById("splash");
  if (!splash || splash.classList.contains("hidden") || splash.style.display === "none") {
    document.body.style.overflow = "";
  }
}

async function resolveAudioPref() {
  const existing = getAudioPref();
  const promptedThisSession = sessionStorage.getItem(AUDIO_PROMPTED_KEY) === "1";

  if (promptedThisSession && (existing === "on" || existing === "off")) {
    return existing;
  }

  const choice = await showAudioPrefDialog();
  sessionStorage.setItem(AUDIO_PROMPTED_KEY, "1");
  setAudioPref(choice);
  return choice;
}

async function activateSiteMusicFromPref() {
  ensureSiteMusic();
  ensureSiteMusicButton();

  if (getAudioPref() === "on") {
    await startSiteMusic();
  } else {
    updateSiteMusicButton(true);
  }
}

async function initSiteAudio({ showButton = true, askIfNeeded = true } = {}) {
  ensureSiteMusic();
  ensureSiteMusicButton();
  setSiteMusicButtonVisible(showButton);

  if (askIfNeeded && getAudioPref() === null) {
    await resolveAudioPref();
  }

  await activateSiteMusicFromPref();
}

document.addEventListener("DOMContentLoaded", () => {

  // ---------- SHARED HEADER / FOOTER PARTIALS ----------
  function setActiveNavLink(nav) {
    const current = location.pathname.split("/").pop() || "index.html";
    nav.querySelectorAll("a").forEach((link) => {
      const linkPage = link.getAttribute("href").split("#")[0];
      link.classList.toggle("active", linkPage === current);
    });
  }

  function wireNavToggle(nav) {
    const navToggle = nav.querySelector("#navToggle");
    const navLinks = nav.querySelector("#navLinks");
    if (!navToggle || !navLinks) return;

    navToggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => navLinks.classList.remove("open"));
    });
    document.addEventListener("click", (e) => {
      if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove("open");
      }
    });
  }

  const navMount = document.getElementById("site-nav-mount");
  if (navMount) {
    const mountNav = () => {
      setActiveNavLink(navMount);
      wireNavToggle(navMount);
      mountSiteMusicButtonInNav();
    };

    if (navMount.querySelector(".site-nav")) {
      mountNav();
    } else {
      fetch("nav-partial.html?v=2", { cache: "no-store" })
        .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
        .then((html) => {
          navMount.innerHTML = html;
          mountNav();
        })
        .catch((err) => console.log("Could not load nav partial:", err));
    }
  }

  const footerMount = document.getElementById("site-footer-mount");
  if (footerMount) {
    fetch("footer-partial.html")
      .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
      .then((html) => {
        footerMount.innerHTML = html;
      })
      .catch((err) => console.log("Could not load footer partial:", err));
  }

  // ---------- SPLASH VIDEO + SOUND TOGGLE ----------
  const splash         = document.getElementById("splash");
  const video          = document.getElementById("heroVideo");
  const enterBtn       = document.getElementById("enterBtn");
  const splashSoundBtn = document.getElementById("splashSoundBtn");

  const skipSplash = document.documentElement.classList.contains("skip-splash");

  if (splash && !skipSplash) {
    document.body.style.overflow = "hidden";
    ensureSiteMusicButton();
    setSiteMusicButtonVisible(false);
  }

  function updateSplashSoundButton(isMuted) {
    if (!splashSoundBtn) return;
    splashSoundBtn.setAttribute("aria-pressed", String(isMuted));
    splashSoundBtn.setAttribute(
      "aria-label",
      isMuted ? "Unmute splash video" : "Mute splash video"
    );
    splashSoundBtn.classList.toggle("is-unmuted", !isMuted);
  }

  async function ensureMutedAutoplay() {
    if (!video) return;

    video.muted = true;
    video.setAttribute("muted", "");
    video.volume = 1;
    updateSplashSoundButton(true);

    if (!video.paused) return;

    try {
      await video.play();
    } catch {
      await new Promise((resolve) => {
        if (video.readyState >= 2) resolve();
        else video.addEventListener("canplay", resolve, { once: true });
      });
      await video.play().catch(() => {});
    }
  }

  async function setSplashSound(on) {
    if (!video) return false;

    video.volume = 1;

    if (!on) {
      video.muted = true;
      video.setAttribute("muted", "");
      updateSplashSoundButton(true);
      if (video.paused) await video.play().catch(() => {});
      return true;
    }

    video.removeAttribute("muted");
    video.muted = false;

    try {
      await video.play();
      updateSplashSoundButton(false);
      return !video.muted && !video.paused;
    } catch {
      video.muted = true;
      video.setAttribute("muted", "");
      updateSplashSoundButton(true);
      await video.play().catch(() => {});
      return false;
    }
  }

  async function enterWeddingSite() {
    if (splash) splash.classList.add("hidden");
    if (video) { video.pause(); video.muted = true; }
    document.documentElement.classList.remove("splash-active");
    document.body.style.overflow = "";
    window.scrollTo(0, 0);

    setSiteMusicButtonVisible(true);
    if (getAudioPref() === "on") {
      await startSiteMusic({ fresh: !shouldResumeMusic() });
    } else {
      updateSiteMusicButton(true);
    }
  }

  function spawnPetal() {
    const petal = document.createElement("span");
    const isMarigold = Math.random() > 0.45;
    petal.className = `petal ${isMarigold ? "petal-marigold" : "petal-rose"}`;
    petal.style.left = `${Math.random() * 100}vw`;
    petal.style.animationDuration = `${3.5 + Math.random() * 3}s`;
    petal.style.animationDelay = `${Math.random() * 0.3}s`;
    petal.style.setProperty("--drift", `${-30 + Math.random() * 60}px`);
    petal.style.setProperty("--spin", `${Math.random() * 720 - 360}deg`);
    document.body.appendChild(petal);
    petal.addEventListener("animationend", () => petal.remove());
  }

  function triggerBlessings() {
    const count = 36 + Math.floor(Math.random() * 16);
    for (let i = 0; i < count; i++) {
      setTimeout(() => spawnPetal(), i * 40);
    }
  }

  if (skipSplash) {
    document.documentElement.classList.remove("splash-active");
    if (splash) splash.style.display = "none";
    if (video) { video.pause(); video.muted = true; }
    initSiteAudio({ showButton: true, askIfNeeded: true });
  } else if (splash) {
    ensureMutedAutoplay();

    if (splashSoundBtn) {
      splashSoundBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        setSplashSound(video.muted);
      });
    }

    // Ask for audio preference as soon as the visitor lands
    resolveAudioPref().then((pref) => {
      if (pref === "on") setSplashSound(true);
      else setSplashSound(false);
    }).catch((err) => console.log("Audio prompt failed:", err));
  } else {
    initSiteAudio({ showButton: true, askIfNeeded: true });
  }

  if (enterBtn) {
    enterBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      enterWeddingSite().then(() => {
        setTimeout(() => triggerBlessings(), 500);
      });
    });
  }

  // ---------- SCROLL REVEAL ----------
  let revealObserver = null;
  function initReveal() {
    if (!revealObserver) {
      // threshold 0 (any pixel intersecting) so that elements taller than the
      // viewport still reveal reliably — a fixed 0.15 ratio can be unreachable
      // for very tall sections on short mobile screens, leaving them stuck hidden.
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0, rootMargin: "0px 0px -80px 0px" });
    }
    document.querySelectorAll(".reveal:not(.visible)").forEach((el) => {
      revealObserver.observe(el);
    });
  }
  initReveal();

  document.addEventListener("wedding:soft-nav", () => {
    initReveal();
    initRSVPForm();
    mountSiteMusicButtonInNav();
    setSiteMusicButtonVisible(true);
    setActiveNavFromUrl(new URL(location.href));
    if (document.getElementById("cdDays")) {
      countdownTimer = null;
      initWeddingCountdown();
    }
  });

  wireSoftNavForMusic();
  wireMobileMusicButtonPlacement();
  setActiveNavFromUrl(new URL(location.href));

  // ---------- MOBILE SINGLE-SCROLL PAGE STITCHING ----------
  const mobilePages = document.getElementById("mobile-pages");

  if (mobilePages) {
    const isMobile = () => window.matchMedia("(max-width: 768px)").matches;

    const loadMobilePages = () => {
      if (mobilePages.dataset.loaded || !isMobile()) return;
      mobilePages.dataset.loaded = "true";

      const sections = Array.from(mobilePages.querySelectorAll(".mobile-page-section"));

      sections.reduce((chain, section) => {
        return chain.then(() =>
          fetch(section.dataset.src)
            .then((res) => (res.ok ? res.text() : null))
            .then((html) => {
              if (!html) return;
              const doc = new DOMParser().parseFromString(html, "text/html");
              const content = doc.getElementById("page-content");
              if (content) section.innerHTML = content.innerHTML;
            })
            .catch((err) => console.log("Could not load section:", section.dataset.src, err))
        );
      }, Promise.resolve()).then(() => {
        initReveal();
        initRSVPForm();
      });
    };

    if (isMobile()) loadMobilePages();
    window.addEventListener("resize", loadMobilePages);
  }

  // ---------- HOME HOTSPOT NAV ALIGNMENT ----------
  // No longer needed for desktop since the image uses width:100%; height:auto
  // (no letterboxing) — hotspot layer is position:absolute inset:0 naturally.
  // Keep a no-op so the code doesn't error if .homepage-art exists.
  const welcomeArt = document.querySelector(".homepage-art");
  if (welcomeArt) {
    // nothing needed — % positions on .desktop-hotspots work directly
  }

  // ---------- HOME PAGE INVITATION NAV ----------
  // Homepage uses the shared nav partial (site-nav-mount).

  // ---------- FLOWER PETAL SHOWER ----------
  function initPetalShower() {
    if (document.getElementById("petalFab")) return;

    const fab = document.createElement("button");
    fab.id = "petalFab";
    fab.className = "petal-fab";
    fab.type = "button";
    fab.setAttribute("aria-label", "Send blessings");
    fab.innerHTML = "<span class=\"petal-fab-icon\">🌸</span><span class=\"petal-fab-label\">Blessings</span>";

    fab.addEventListener("click", () => triggerBlessings());

    document.body.appendChild(fab);
  }

  initPetalShower();

  initRSVPForm();

});

// ---------- WEDDING COUNTDOWN ----------
// Top-level so it always runs once the DOM is ready (homepage only).
let countdownTimer = null;

function initWeddingCountdown() {
  const daysEl = document.getElementById("cdDays");
  if (!daysEl || countdownTimer) return;

  // 27 Aug 2026, 11:20 AM IST (UTC+5:30) — UTC form avoids Safari ISO parsing bugs.
  const MUHURTHAM = Date.UTC(2026, 7, 27, 5, 50, 0);

  function pad(n) { return String(n).padStart(2, "0"); }

  function updateCountdown() {
    const diff = MUHURTHAM - Date.now();
    if (diff <= 0) {
      ["cdDays", "cdHours", "cdMins", "cdSecs"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = "0";
      });
      clearInterval(countdownTimer);
      return;
    }

    daysEl.textContent = String(Math.floor(diff / 86400000));
    const h = document.getElementById("cdHours");
    const m = document.getElementById("cdMins");
    const s = document.getElementById("cdSecs");
    if (h) h.textContent = pad(Math.floor((diff % 86400000) / 3600000));
    if (m) m.textContent = pad(Math.floor((diff % 3600000) / 60000));
    if (s) s.textContent = pad(Math.floor((diff % 60000) / 1000));
  }

  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWeddingCountdown);
} else {
  initWeddingCountdown();
}

// ---------- RSVP FORM ----------
// Declared at top level (not inside the DOMContentLoaded closure) so the
// inline onclick/onsubmit attributes on rsvp.html's markup can find these
// globally — including when that markup is stitched into index.html for
// the mobile single-scroll view.
let guests = 1;

function syncRSVPAttendanceFields(form) {
  if (!form) return;

  const attending = form.querySelector('input[name="attending"]:checked')?.value;
  const isRegret = attending === "no";
  const container = form.querySelector(".rsvp-checkboxes");
  const eventsField = form.querySelector("#rsvpEventsField");
  const guestsField = form.querySelector("#rsvpGuestsField");
  const guestsCounter = form.querySelector("#rsvpGuestsCounter") || form.querySelector(".rsvp-counter");
  const checkboxes = form.querySelectorAll('input[name="events"]');

  checkboxes.forEach((checkbox) => {
    if (isRegret) {
      checkbox.checked = false;
      checkbox.disabled = true;
    } else {
      checkbox.disabled = false;
    }
  });

  if (container) {
    container.classList.toggle("is-disabled", isRegret);
    container.setAttribute("aria-disabled", String(isRegret));
  }

  if (eventsField) {
    eventsField.classList.toggle("is-disabled", isRegret);
  }

  if (guestsField) {
    guestsField.classList.toggle("is-disabled", isRegret);
  }

  if (guestsCounter) {
    guestsCounter.classList.toggle("is-disabled", isRegret);
    guestsCounter.setAttribute("aria-disabled", String(isRegret));
    guestsCounter.querySelectorAll("button").forEach((btn) => {
      btn.disabled = isRegret;
    });
  }
}

function initRSVPForm() {
  const form = document.getElementById("rsvpForm");
  if (!form || form.dataset.rsvpWired === "true") return;

  form.dataset.rsvpWired = "true";
  form.querySelectorAll('input[name="attending"]').forEach((radio) => {
    radio.addEventListener("change", () => syncRSVPAttendanceFields(form));
  });

  syncRSVPAttendanceFields(form);
}

function changeGuests(delta) {
  const form = document.getElementById("rsvpForm");
  const attending = form?.querySelector('input[name="attending"]:checked')?.value;
  if (attending === "no") return;

  guests = Math.max(1, Math.min(20, guests + delta));
  const countEl = document.getElementById("guestCount");
  const valueEl = document.getElementById("rsvp-guests-value");
  if (countEl) countEl.textContent = guests;
  if (valueEl) valueEl.value = guests;
}

async function submitRSVP(e) {
  e.preventDefault();
  const form = document.getElementById("rsvpForm");
  if (!form) return;

  const attending = form.querySelector('input[name="attending"]:checked')?.value;
  if (!attending) {
    alert("Please select your response (Joyfully Joining or Regretfully Declining).");
    return;
  }

  const scriptUrl = window.RSVP_SCRIPT_URL;
  if (!scriptUrl) {
    alert("RSVP is not connected yet. Please ask the hosts to finish the Google Sheets setup.");
    return;
  }

  const submitBtn = form.querySelector(".rsvp-submit");
  const errorEl = document.getElementById("rsvpError");
  const originalLabel = submitBtn ? submitBtn.textContent : "";

  if (errorEl) {
    errorEl.style.display = "none";
    errorEl.textContent = "";
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
  }

  const formData = new FormData(form);
  const payload = {
    name: String(formData.get("name") || "").trim(),
    guests: attending === "no" ? 0 : Number(formData.get("guests") || 1),
    attending,
    events: attending === "no" ? [] : formData.getAll("events"),
    message: String(formData.get("message") || "").trim(),
  };

  try {
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Could not save RSVP");
    }

    form.style.display = "none";
    const successEl = document.getElementById("rsvpSuccess");
    if (successEl) {
      successEl.style.display = "block";
      successEl.scrollIntoView({ behavior: "smooth" });
    }
  } catch (err) {
    console.error("RSVP submission failed:", err);
    if (errorEl) {
      errorEl.textContent = "Something went wrong sending your RSVP. Please try again in a moment.";
      errorEl.style.display = "block";
    } else {
      alert("Something went wrong sending your RSVP. Please try again in a moment.");
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  }
}

// ---------- GIFT REGISTRY ----------
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = "Copied ✓";
    btn.style.background = "var(--maroon)";
    btn.style.color = "var(--gold-pale)";
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.background = "";
      btn.style.color = "";
    }, 2000);
  }).catch(() => {
    prompt("Copy this:", text);
  });
}
