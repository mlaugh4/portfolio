document.documentElement.classList.add("js");

document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

const topbar = document.querySelector(".topbar");
const onScroll = () => topbar.classList.toggle("is-scrolled", window.scrollY > 8);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

const shots = [...document.querySelectorAll(".shot")];
const deckMedia = window.matchMedia(
  "(min-width: 961px) and (min-height: 801px) and (prefers-reduced-motion: no-preference)"
);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const between = (min, max) => min + Math.random() * (max - min);
const signed = (min, max) => between(min, max) * (Math.random() < 0.5 ? -1 : 1);

if (deckMedia.matches) {
  // Each card drifts in scaled, tilted, and shifted, rests in the middle,
  // then tilts away and washes out. Ranges match srcurran.com.
  document.documentElement.classList.add("deck");
  const poses = shots.map(() => ({
    enterRot: signed(1, 2.5),
    exitRot: signed(1, 2.5),
    enterX: signed(25, 75),
    exitX: signed(25, 75),
    enterScale: between(0.875, 0.925),
    exitScale: between(0.875, 0.925),
  }));

  const render = () => {
    const vh = window.innerHeight;
    shots.forEach((shot, index) => {
      const pose = poses[index];
      const rect = shot.getBoundingClientRect();
      const s = rect.top / vh;
      // His deck settles a card early when the next one is close. These
      // projects are a viewport apart, so settle at center or the move
      // finishes before the card is on screen.
      const settled = 0.5 - rect.height / vh / 2;
      const enterFrom = settled + 0.4;
      const enter = clamp((enterFrom - s) / (enterFrom - settled), 0, 1);
      const exit = clamp((0.1 - s) / 0.4, 0, 1);
      const scale =
        pose.enterScale + (1 - pose.enterScale) * enter - (1 - pose.exitScale) * exit;
      const room = Math.max(0, (window.innerWidth - rect.width) / 2 - 12);
      const x = clamp(pose.enterX * (1 - enter) + pose.exitX * exit, -room, room);

      shot.style.setProperty("--x", `${x.toFixed(2)}px`);
      shot.style.setProperty("--rot", `${(pose.enterRot * (1 - enter) + pose.exitRot * exit).toFixed(3)}deg`);
      shot.style.setProperty("--scale", scale.toFixed(4));
      shot.style.setProperty("--dim", (0.55 * exit).toFixed(3));
      shot.style.setProperty("--focus", String(Math.round(enter * (1 - exit) * 100) / 100));
      shot.style.setProperty("--parallax", (12 * (1 - enter) - 12 * exit).toFixed(2));
    });
  };

  let frame = 0;
  const requestRender = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      render();
    });
  };

  render();
  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", requestRender, { passive: true });
} else {
  const revealer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        revealer.unobserve(entry.target);
      }
    },
    { threshold: 0.12 }
  );
  shots.forEach((el) => revealer.observe(el));
}

const highlights = document.querySelector(".highlights");
if (highlights) {
  const updateFade = () => {
    const max = highlights.scrollWidth - highlights.clientWidth;
    highlights.classList.toggle("is-scrolled", highlights.scrollLeft > 2);
    highlights.classList.toggle("is-at-end", highlights.scrollLeft >= max - 2);
  };
  updateFade();
  highlights.addEventListener("scroll", updateFade, { passive: true });
  window.addEventListener("resize", updateFade, { passive: true });
}

const sideNav = document.querySelector("[data-side-nav]");
const navList = sideNav.querySelector(".side-nav__list");
const navLinks = new Map(
  [...sideNav.querySelectorAll(".nav-link")].map((a) => [a.hash.slice(1), a])
);

const moveMarker = (link) => {
  const dash = link.querySelector(".nav-link__dash");
  const y = link.offsetTop + (link.offsetHeight - dash.offsetHeight) / 2;
  navList.style.setProperty("--marker-y", `${y}px`);
};

const setActive = (id) => {
  const link = navLinks.get(id);
  if (!link) return;
  navLinks.forEach((a) => a.removeAttribute("aria-current"));
  link.setAttribute("aria-current", "true");
  moveMarker(link);
};

// Labels need ~180px of gutter beside the media column; below 64px the rail is hidden.
const mediaWidth = () =>
  Math.min(window.innerWidth, 56 * parseFloat(getComputedStyle(document.documentElement).fontSize));
const fitNav = () => {
  const gutter = (window.innerWidth - mediaWidth()) / 2;
  sideNav.classList.toggle("is-hidden", gutter < 64);
  sideNav.classList.toggle("is-collapsed", gutter < 180);
};
fitNav();
window.addEventListener("resize", fitNav, { passive: true });

if (window.matchMedia("(hover: hover)").matches) {
  sideNav.addEventListener("pointerenter", () => sideNav.classList.add("is-revealed"));
  sideNav.addEventListener("pointerleave", () => sideNav.classList.remove("is-revealed"));
}

setActive("about");
const remeasureMarker = () => {
  const current = sideNav.querySelector('.nav-link[aria-current="true"]');
  if (current) moveMarker(current);
};
document.fonts?.ready.then(remeasureMarker);
window.addEventListener("resize", remeasureMarker, { passive: true });
const spy = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) setActive(entry.target.id);
    }
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
navLinks.forEach((_, id) => {
  const section = document.getElementById(id);
  if (section) spy.observe(section);
});

document.addEventListener("click", (event) => {
  document.querySelectorAll("details.role[open]").forEach((details) => {
    if (!details.contains(event.target)) details.removeAttribute("open");
  });
});

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
document.querySelectorAll("[data-inline-video]").forEach((video) => {
  if (reduceMotion) {
    // Cards that open a deep dive keep the click for the overlay.
    if (!video.parentElement.querySelector(".frame__open")) video.controls = true;
    return;
  }
  const playback = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      }
    },
    { threshold: 0.25 }
  );
  playback.observe(video);
});

// Deep dives: the card grows into the overlay's media slot and shrinks back on close.
const EXPAND = { duration: 600, easing: "cubic-bezier(0.16, 1, 0.3, 1)" };
const COLLAPSE = { duration: 480, easing: "cubic-bezier(0.4, 0, 0.2, 1)" };

const cardBox = (frame) => {
  const shot = frame.closest(".shot");
  const style = getComputedStyle(shot);
  const rect = frame.getBoundingClientRect();
  const scale = parseFloat(style.getPropertyValue("--scale")) || 1;
  return {
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
    width: frame.offsetWidth * scale,
    rot: parseFloat(style.getPropertyValue("--rot")) || 0,
  };
};

const transformFrom = (box, rect) => {
  const dx = box.cx - (rect.left + rect.width / 2);
  const dy = box.cy - (rect.top + rect.height / 2);
  return `translate(${dx}px, ${dy}px) rotate(${box.rot}deg) scale(${box.width / rect.width})`;
};

// A still copy of a frame, so the current video frame travels with the card.
const makeGhost = (frame, rect) => {
  const ghost = document.createElement("div");
  ghost.className = "deep-dive__ghost";
  // Bleed styles hang off an ancestor, so the copy needs it to keep its layout.
  if (frame.closest(".shot--bleed")) ghost.classList.add("shot--bleed");
  Object.assign(ghost.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  const copy = frame.cloneNode(true);
  copy.querySelector(".frame__open")?.remove();
  copy.style.visibility = "visible";
  const source = frame.querySelector("video");
  const clone = copy.querySelector("video");
  if (source && clone) {
    clone.removeAttribute("src");
    if (source.readyState >= 2) {
      const still = document.createElement("canvas");
      still.width = source.videoWidth;
      still.height = source.videoHeight;
      still.getContext("2d").drawImage(source, 0, 0, still.width, still.height);
      clone.replaceWith(still);
    }
  }
  ghost.append(copy);
  return ghost;
};

const lockPage = (locked) => document.documentElement.classList.toggle("is-locked", locked);

// Settles even if the browser never gets around to finishing the animation.
const fly = (ghost, keyframes, timing) => {
  const done = Promise.race([
    ghost.animate(keyframes, timing).finished,
    new Promise((resolve) => setTimeout(resolve, timing.duration + 150)),
  ]);
  return done.catch(() => {}).then(() => ghost.remove());
};

document.querySelectorAll("[data-deep-dive]").forEach((trigger) => {
  const dialog = document.getElementById(trigger.dataset.deepDive);
  if (!dialog) return;
  const card = trigger.closest(".frame");
  const cardVideo = card.querySelector("video");
  const slot = dialog.querySelector("[data-deep-dive-media]");
  const slides = [...dialog.querySelectorAll("[data-slide]")];
  const copies = [...dialog.querySelectorAll("[data-slide-copy]")];
  const prev = dialog.querySelector("[data-slide-prev]");
  const next = dialog.querySelector("[data-slide-next]");
  const count = dialog.querySelector("[data-slide-count]");
  const activeFrame = () =>
    slot.querySelector(".deep-dive__slide.is-current .frame") || slot.querySelector(".frame");
  const videos = [...slot.querySelectorAll("video")];
  const video = videos[0];
  let closing = false;
  let slide = 0;
  let swapToken = 0;

  const SLIDE = { duration: 520, easing: "cubic-bezier(0.16, 1, 0.3, 1)" };
  const COPY_OUT = { duration: 180, easing: "ease-in" };
  const COPY_IN = { duration: 320, easing: "cubic-bezier(0.16, 1, 0.3, 1)" };

  const swapCopy = (from, to, token) => {
    if (!from || from === to) {
      if (to) to.hidden = false;
      return;
    }
    const fade = from.animate(
      [{ opacity: 1 }, { opacity: 0, transform: "translateY(6px)" }],
      COPY_OUT
    );
    Promise.race([
      fade.finished.catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, COPY_OUT.duration + 50)),
    ])
      .then(() => {
        if (token !== swapToken) return;
        from.hidden = true;
        to.hidden = false;
        to.animate(
          [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
          COPY_IN
        );
      });
  };

  const showSlide = (index, animate = false) => {
    if (!slides.length) return;
    const target = Math.min(Math.max(index, 0), slides.length - 1);
    const from = slide;
    slide = target;
    const token = ++swapToken;
    const dir = target > from ? 1 : -1;
    const outgoing = slides[from];
    const incoming = slides[target];

    [...slides, ...copies].forEach((item) => item.getAnimations().forEach((a) => a.cancel()));
    slides.forEach((item, i) => item.classList.toggle("is-current", i === target));

    if (!animate || from === target || reduceMotion) {
      slides.forEach((item, i) => (item.hidden = i !== target));
      copies.forEach((item, i) => (item.hidden = i !== target));
    } else {
      slides.forEach((item, i) => (item.hidden = i !== target && i !== from));
      outgoing
        .animate(
          [
            { opacity: 1, transform: "none" },
            { opacity: 0, transform: `translateX(${-dir * 8}%) scale(0.94)` },
          ],
          SLIDE
        )
        .finished.catch(() => {})
        .then(() => {
          if (token === swapToken) outgoing.hidden = true;
        });
      incoming.animate(
        [
          { opacity: 0, transform: `translateX(${dir * 8}%) scale(0.94)` },
          { opacity: 1, transform: "none" },
        ],
        SLIDE
      );
      copies.forEach((item, i) => {
        if (i !== from && i !== target) item.hidden = true;
      });
      swapCopy(copies[from], copies[target], token);
    }

    if (prev) prev.disabled = target === 0;
    if (next) next.disabled = target === slides.length - 1;
    if (count) {
      count.hidden = slides.length < 2;
      count.textContent = `${target + 1} / ${slides.length}`;
    }
    videos.forEach((item) => item.pause());
    if (target === 0) {
      playSlot();
    }
  };

  if (reduceMotion) videos.forEach((item) => (item.controls = true));

  // Syncing to the card's frame seeks, and that seek aborts play(), so retry when it lands.
  const playSlot = () => {
    if (!video || !dialog.open || closing) return;
    const attempt = () => {
      if (!dialog.open || closing) return;
      video.play().catch((error) => {
        if (error?.name !== "AbortError" || !dialog.open || closing) return;
        const retry = () => {
          if (!dialog.open || closing || video.seeking) return;
          video.play().catch(() => {});
        };
        video.addEventListener("seeked", retry, { once: true });
        // The seek can finish before the listener exists.
        if (!video.seeking) requestAnimationFrame(retry);
      });
    };
    attempt();
  };

  const playCurrentSlideVideo = () => {
    if (!dialog.open || closing) return;
    const activeVideo = slot.querySelector(".deep-dive__slide.is-current video");
    videos.forEach((item) => {
      if (item !== activeVideo) item.pause();
    });
    if (!activeVideo) return;
    if (activeVideo === video) {
      playSlot();
      return;
    }
    activeVideo.preload = "auto";
    activeVideo.play().catch(() => {
      activeVideo.addEventListener("canplay", playCurrentSlideVideo, { once: true });
    });
  };

  const goToSlide = (index) => {
    showSlide(index, true);
    setTimeout(playCurrentSlideVideo, 0);
  };

  if (slides.length) showSlide(0);

  const open = () => {
    if (dialog.open) return;
    if (video && cardVideo) {
      video.preload = "auto";
      video.currentTime = cardVideo.currentTime;
    }
    showSlide(0);
    lockPage(true);
    dialog.showModal();
    dialog.scrollTop = 0;
    playSlot();

    if (reduceMotion) {
      dialog.classList.add("is-open");
      return;
    }

    const frame = activeFrame();
    const target = frame.getBoundingClientRect();
    const ghost = makeGhost(card, target);
    const from = transformFrom(cardBox(card), target);
    frame.style.visibility = "hidden";
    card.style.visibility = "hidden";
    dialog.append(ghost);
    // Flush styles so the white sheet fades in instead of snapping on.
    void getComputedStyle(dialog).backgroundColor;
    dialog.classList.add("is-open");
    fly(ghost, [{ transform: from }, { transform: "none" }], EXPAND).then(() => {
      if (!dialog.open || closing) return;
      frame.style.visibility = "";
      playSlot();
    });
  };

  const close = () => {
    if (closing || !dialog.open) return;
    closing = true;
    videos.forEach((item) => item.pause());
    if (video && cardVideo && video.readyState > 0) cardVideo.currentTime = video.currentTime;
    dialog.querySelectorAll(".deep-dive__ghost").forEach((ghost) => ghost.remove());
    dialog.classList.remove("is-open");

    if (reduceMotion) {
      finish();
      return;
    }

    const frame = activeFrame();
    const start = frame.getBoundingClientRect();
    const ghost = makeGhost(frame, start);
    const to = transformFrom(cardBox(card), start);
    frame.style.visibility = "hidden";
    dialog.append(ghost);
    fly(ghost, [{ transform: "none" }, { transform: to }], COLLAPSE).then(finish);
  };

  const reset = () => {
    dialog.querySelectorAll(".deep-dive__ghost").forEach((ghost) => ghost.remove());
    dialog.classList.remove("is-open");
    slot.querySelectorAll(".frame").forEach((frame) => {
      frame.style.visibility = "";
    });
    card.style.visibility = "";
    videos.forEach((item) => item.pause());
    lockPage(false);
    closing = false;
  };

  const finish = () => {
    if (dialog.open) dialog.close();
    reset();
    trigger.focus({ preventScroll: true });
  };

  // The dialog can also be closed natively, so the page never stays locked.
  dialog.addEventListener("close", () => {
    if (dialog.open || !document.documentElement.classList.contains("is-locked")) return;
    reset();
    trigger.focus({ preventScroll: true });
  });

  trigger.addEventListener("click", open);
  prev?.addEventListener("click", () => goToSlide(slide - 1));
  next?.addEventListener("click", () => goToSlide(slide + 1));
  dialog.querySelector("[data-deep-dive-close]")?.addEventListener("click", close);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowLeft" && slide > 0) goToSlide(slide - 1);
    if (event.key === "ArrowRight" && slide < slides.length - 1) goToSlide(slide + 1);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document.querySelectorAll("details.role[open]").forEach((details) => {
    details.removeAttribute("open");
    details.querySelector("summary")?.focus();
  });
});
