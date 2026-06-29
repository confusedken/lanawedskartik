// ---------- SPLASH SCREEN ----------
document.addEventListener("DOMContentLoaded", () => {
  const splash = document.getElementById("splash");
  const video = document.getElementById("heroVideo");
  const soundPrompt = document.getElementById("soundPrompt");
  const enterBtn = document.getElementById("enterBtn");

  // Only run splash logic on the home page (it exists only there)
  if (splash) {
    // Arrived via the Home nav link (#main) — splash is already hidden via
    // CSS; also stop the video so it isn't silently playing in the background.
    if (document.documentElement.classList.contains("skip-splash")) {
      if (video) {
        video.pause();
        video.muted = true;
      }
      document.body.style.overflow = "auto";
    }

    if (soundPrompt && video) {
      soundPrompt.addEventListener("click", async () => {
        try {
          video.muted = false;
          video.volume = 1;
          await video.play();
          soundPrompt.style.opacity = "0";
          setTimeout(() => { soundPrompt.style.display = "none"; }, 300);
        } catch (err) {
          console.log("Audio could not start:", err);
        }
      });
    }

    if (enterBtn) {
      enterBtn.addEventListener("click", () => {
        splash.classList.add("hidden");
        if (video) {
          video.pause();
          video.muted = true;
        }
        document.body.style.overflow = "auto";
      });
    }
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
