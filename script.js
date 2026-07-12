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
    fetch("nav-partial.html")
      .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
      .then((html) => {
        navMount.innerHTML = html;
        setActiveNavLink(navMount);
        wireNavToggle(navMount);
      })
      .catch((err) => console.log("Could not load nav partial:", err));
  }

  const footerMount = document.getElementById("site-footer-mount");
  if (footerMount) {
    fetch("footer-partial.html")
      .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
      .then((html) => { footerMount.innerHTML = html; })
      .catch((err) => console.log("Could not load footer partial:", err));
  }

  // ---------- SOUND MODAL + SPLASH ----------
  const soundModal = document.getElementById("soundModal");
  const soundYes   = document.getElementById("soundYes");
  const soundNo    = document.getElementById("soundNo");
  const splash     = document.getElementById("splash");
  const video      = document.getElementById("heroVideo");
  const enterBtn   = document.getElementById("enterBtn");

  const skipSplash = document.documentElement.classList.contains("skip-splash");

  if (soundModal) {
    if (skipSplash) {
      // Arrived via Home nav link — skip modal + splash entirely
      soundModal.style.display = "none";
      if (splash) splash.style.display = "none";
      if (video)  { video.pause(); video.muted = true; }
    } else {
      // Normal first visit — show modal, video plays muted underneath
      // (browser autoplay keeps it running muted; we just control sound)
      const dismissModal = (withSound) => {
        // Instantly remove modal — no fade delay that could confuse user
        soundModal.style.display = "none";
        document.body.style.overflow = "";

        if (video) {
          if (withSound) {
            video.muted = false;
            video.volume = 1;
            video.play().catch(() => { video.muted = true; }); // fallback if browser blocks
          } else {
            video.muted = true;
            video.play().catch(() => {});
          }
        }
      };

      if (soundYes) soundYes.addEventListener("click", () => dismissModal(true));
      if (soundNo)  soundNo.addEventListener("click",  () => dismissModal(false));
    }
  }

  // "Enter Our Wedding" — hide splash + stop video
  if (enterBtn) {
    enterBtn.addEventListener("click", () => {
      if (splash) splash.classList.add("hidden");
      if (video)  { video.pause(); video.muted = true; }
      document.body.style.overflow = "";
    });
  }

  // ---------- SCROLL REVEAL ----------
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

});

// ---------- RSVP FORM ----------
// Declared at top level (not inside the DOMContentLoaded closure) so the
// inline onclick/onsubmit attributes on rsvp.html's markup can find these
// globally — including when that markup is stitched into index.html for
// the mobile single-scroll view.
let guests = 1;

function changeGuests(delta) {
  guests = Math.max(1, Math.min(20, guests + delta));
  const countEl = document.getElementById("guestCount");
  const valueEl = document.getElementById("rsvp-guests-value");
  if (countEl) countEl.textContent = guests;
  if (valueEl) valueEl.value = guests;
}

function submitRSVP(e) {
  e.preventDefault();
  const form = document.getElementById("rsvpForm");
  const attending = form.querySelector('input[name="attending"]:checked')?.value;
  if (!attending) {
    alert("Please select your response (Joyfully Joining or Sadly Regret).");
    return;
  }
  // In production wire this to a real backend/FormSubmit/Netlify Forms etc.
  document.getElementById("rsvpForm").style.display = "none";
  document.getElementById("rsvpSuccess").style.display = "block";
  document.getElementById("rsvpSuccess").scrollIntoView({ behavior: "smooth" });
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
