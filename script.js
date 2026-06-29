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

  // ---------- SCROLL REVEAL (used on Our Story page) ----------
  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });

    revealEls.forEach((el) => observer.observe(el));
  }
});
