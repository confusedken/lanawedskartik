// ---------- SPLASH SCREEN ----------
document.addEventListener("DOMContentLoaded", () => {
  const splash = document.getElementById("splash");
  const video = document.getElementById("heroVideo");
  const soundPrompt = document.getElementById("soundPrompt");
  const enterBtn = document.getElementById("enterBtn");

  // ---------- SOUND MODAL → SPLASH VIDEO ----------
  const soundModal = document.getElementById("soundModal");
  const soundYes   = document.getElementById("soundYes");
  const soundNo    = document.getElementById("soundNo");
  const splash     = document.getElementById("splash");
  const video      = document.getElementById("heroVideo");
  const enterBtn   = document.getElementById("enterBtn");

  // Only show the modal on the home page (skip-splash class = arriving via nav)
  if (soundModal && !document.documentElement.classList.contains("skip-splash")) {
    // Keep video muted and paused until user chooses
    if (video) { video.muted = true; video.pause(); }
    document.body.style.overflow = "hidden";

    const dismissModal = (withSound) => {
      soundModal.classList.add("hidden");
      setTimeout(() => { soundModal.style.display = "none"; }, 400);
      if (video) {
        video.muted = !withSound;
        video.volume = 1;
        video.play().catch(() => {});
      }
    };

    if (soundYes) soundYes.addEventListener("click", () => dismissModal(true));
    if (soundNo)  soundNo.addEventListener("click",  () => dismissModal(false));

  } else if (soundModal) {
    // Skip-splash path: hide modal immediately
    soundModal.style.display = "none";
    if (video) { video.pause(); video.muted = true; }
    document.body.style.overflow = "auto";
  }

  // Enter Our Wedding button — dismiss splash + stop video
  if (enterBtn) {
    enterBtn.addEventListener("click", () => {
      if (splash) splash.classList.add("hidden");
      if (video)  { video.pause(); video.muted = true; }
      document.body.style.overflow = "auto";
    });
  }

  // ---------- MOBILE NAV TOGGLE ----------
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });

    navLinks.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => navLinks.classList.remove("open"));
    });
  }

  // ---------- SCROLL REVEAL ----------
  // Reusable so it can be re-run after mobile pages are stitched in below.
  let revealObserver = null;
  function initReveal() {
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
    }
    document.querySelectorAll(".reveal:not(.visible)").forEach((el) => {
      revealObserver.observe(el);
    });
  }
  initReveal();

  // ---------- MOBILE SINGLE-SCROLL PAGE STITCHING ----------
  // On mobile, Events / Contact Us / Our Story / FAQs are fetched and their
  // #page-content is dropped into the home page so the whole site is one
  // continuous scroll, with no hamburger menu needed. Desktop is untouched.
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
              if (content) {
                section.innerHTML = content.innerHTML;
              }
            })
            .catch((err) => {
              console.log("Could not load section:", section.dataset.src, err);
            })
        );
      }, Promise.resolve()).then(() => {
        // Newly injected sections bring their own .reveal elements
        initReveal();
      });
    };

    if (isMobile()) {
      loadMobilePages();
    }
    window.addEventListener("resize", loadMobilePages);
  }
});
