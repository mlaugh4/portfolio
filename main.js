document.documentElement.classList.add("js");

const GATE_PASSWORD = "topsecret";
const gateForm = document.querySelector("[data-gate-form]");
const gateInput = document.querySelector("[data-gate-input]");
const gateError = document.querySelector("[data-gate-error]");
const gateFields = document.querySelector(".gate__fields");
const contactLink = document.querySelector(".topbar__contact");

if (!document.documentElement.classList.contains("is-unlocked") && contactLink) {
  contactLink.addEventListener("click", (event) => {
    if (document.documentElement.classList.contains("is-unlocked")) return;
    event.preventDefault();
    window.location.href = "mailto:mwlaugh@gmail.com";
  });
}

gateForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const entered = gateInput.value;
  if (entered !== GATE_PASSWORD) {
    gateFields.classList.add("is-invalid");
    gateError.hidden = false;
    gateInput.setAttribute("aria-invalid", "true");
    gateInput.select();
    return;
  }
  try {
    localStorage.setItem("v2-gate", "1");
  } catch (error) {}
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  gateInput.blur();
  root.classList.add("is-unlocking");
  window.setTimeout(
    () => {
      root.classList.add("is-unlocked", "is-revealing");
      root.classList.remove("is-unlocking");
      gateInput.value = "";
      window.setTimeout(() => root.classList.remove("is-revealing"), 700);
    },
    reduceMotion ? 0 : 450
  );
});

if (!document.documentElement.classList.contains("is-unlocked")) {
  gateInput?.focus();
}

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
  copy.querySelector(".vimeo-bar")?.remove();
  copy.querySelectorAll("iframe").forEach((frame) => frame.removeAttribute("src"));
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
  const vimeoSrc = reduceMotion
    ? "https://player.vimeo.com/video/367562203?controls=0&title=0&byline=0&portrait=0&dnt=1"
    : "https://player.vimeo.com/video/367562203?autoplay=1&muted=1&loop=1&autopause=0&controls=0&title=0&byline=0&portrait=0&dnt=1";
  const vimeoPlayers = new WeakMap();

  const clock = (seconds) => {
    const whole = Math.max(0, Math.round(seconds));
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
  };

  const attachVimeo = (frame) => {
    const shell = frame.parentElement.querySelector(".vimeo-bar");
    const input = shell?.querySelector("input");
    const label = shell?.querySelector("[data-vimeo-time]");
    if (!input || !label) return;
    let state = vimeoPlayers.get(frame);
    if (state?.player || state?.pending) return;
    if (!state) {
      state = { player: null, duration: 0, scrubbing: false };
      vimeoPlayers.set(frame, state);
      const show = (seconds, total, fromUser) => {
        const pct = total ? (seconds / total) * 100 : 0;
        if (!fromUser) input.value = String(pct);
        input.style.setProperty("--p", `${pct}%`);
        input.setAttribute("aria-valuenow", String(Math.round(pct)));
        input.setAttribute("aria-valuetext", `${clock(seconds)} of ${clock(total)}`);
        label.textContent = `${clock(seconds)} / ${clock(total)}`;
      };
      state.show = show;
      input.addEventListener("input", () => {
        state.scrubbing = true;
        if (state.duration) show((Number(input.value) / 100) * state.duration, state.duration, true);
      });
      input.addEventListener("change", () => {
        const ratio = Number(input.value) / 100;
        state.scrubbing = false;
        if (state.player && state.duration) {
          state.player.setCurrentTime(ratio * state.duration).catch(() => {});
        }
      });
    }
    state.pending = true;
    const ready = window.Vimeo
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://player.vimeo.com/api/player.js";
          script.onload = () => resolve();
          script.onerror = () => reject();
          document.head.appendChild(script);
        });
    ready
      .then(() => {
        state.pending = false;
        if (!frame.isConnected || !frame.getAttribute("src") || state.player) return;
        const player = new window.Vimeo.Player(frame);
        state.player = player;
        player.on("timeupdate", (data) => {
          state.duration = data.duration || state.duration;
          frame.parentElement.classList.add("is-ready");
          if (!state.scrubbing) state.show(data.seconds, state.duration, false);
        });
      })
      .catch(() => {
        state.pending = false;
      });
  };

  const releaseVimeo = (frame) => {
    const state = vimeoPlayers.get(frame);
    state?.player?.off("timeupdate");
    if (state) state.player = null;
    frame.parentElement.classList.remove("is-ready");
  };

  const syncVimeo = () => {
    slot.querySelectorAll("iframe[data-vimeo]").forEach((frame) => {
      const active =
        dialog.open && !closing && frame.closest(".deep-dive__slide")?.classList.contains("is-current");
      if (active) {
        if (!frame.getAttribute("src")) frame.src = vimeoSrc;
        attachVimeo(frame);
        return;
      }
      if (frame.getAttribute("src")) {
        releaseVimeo(frame);
        frame.removeAttribute("src");
      }
    });
  };
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
    syncVimeo();
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
    const activeVideos = [...slot.querySelectorAll(".deep-dive__slide.is-current video")];
    videos.forEach((item) => {
      if (!activeVideos.includes(item)) item.pause();
    });
    activeVideos.forEach((activeVideo) => {
      if (activeVideo === video && slide === 0) {
        playSlot();
        return;
      }
      activeVideo.preload = "auto";
      const start = () => {
        if (!dialog.open || closing) return;
        activeVideo.play().catch(() => {});
      };
      if (activeVideo.readyState >= 2) start();
      else activeVideo.addEventListener("canplay", start, { once: true });
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
      if (slide === 0) playSlot();
      else playCurrentSlideVideo();
    });
  };

  const close = () => {
    if (closing || !dialog.open) return;
    closing = true;
    videos.forEach((item) => item.pause());
    syncVimeo();
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
    syncVimeo();
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

document.querySelectorAll("[data-case-study]").forEach((trigger) => {
  const dialog = document.getElementById(trigger.dataset.caseStudy);
  if (!dialog) return;
  const videos = [...dialog.querySelectorAll("video")];
  const track = dialog.querySelector("[data-phase-track]");
  const stage = track?.querySelector(".case-study__phases-stage");
  const phases = track ? [...track.querySelectorAll(".case-study__phase")] : [];
  const dots = track ? [...track.querySelectorAll(".case-study__phases-progress span")] : [];
  const live = track?.querySelector(".case-study__phases-live");
  const phaseVideos = new Set(phases.flatMap((phase) => [...phase.querySelectorAll("video")]));
  const narrow = window.matchMedia("(max-width: 760px)");
  if (reduceMotion) videos.forEach((video) => (video.controls = true));
  let playback = null;
  let activePhase = -1;
  let stageWasVisible = false;

  // The dialog is its own scroll container, so the viewport root would never
  // see these clips move. A tall clip can fill the screen before half of it
  // is inside, so either condition counts as "scrolled to".
  const inView = (entry) => {
    if (!entry.isIntersecting || !dialog.open) return false;
    const rootHeight = entry.rootBounds?.height || dialog.clientHeight;
    return entry.intersectionRatio >= 0.45 || entry.intersectionRect.height >= rootHeight * 0.6;
  };

  const startPlayback = () => {
    playback?.disconnect();
    if (reduceMotion) return;
    playback = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target;
          if (track?.classList.contains("is-pinned") && phaseVideos.has(video)) return;
          if (inView(entry)) video.play().catch(() => {});
          else video.pause();
        }
      },
      { root: dialog, threshold: [0.15, 0.45, 0.75] }
    );
    videos.forEach((video) => playback.observe(video));
  };

  const stageVisible = () => {
    if (!stage) return false;
    const box = stage.getBoundingClientRect();
    const root = dialog.getBoundingClientRect();
    return box.bottom > root.top + 48 && box.top < root.bottom - 48;
  };

  const layoutPhases = () => {
    if (!track || !stage) return;
    track.classList.add("is-pinned");
    const header = dialog.querySelector(".deep-dive__bar")?.offsetHeight || 0;
    const stageHeight = stage.offsetHeight;
    const room = dialog.clientHeight - header - 24;
    const pin = !reduceMotion && !narrow.matches && stageHeight > 0 && stageHeight <= room;
    track.classList.toggle("is-pinned", pin);
    if (!pin) {
      activePhase = -1;
      stageWasVisible = false;
      phases.forEach((phase) => {
        phase.classList.remove("is-active");
        phase.removeAttribute("inert");
      });
      dots.forEach((dot) => dot.classList.remove("is-active"));
      if (live) live.textContent = "";
      return;
    }
    const pinTop = Math.max(header + 16, (dialog.clientHeight - stage.offsetHeight) / 2);
    track.style.setProperty("--pin-top", `${pinTop}px`);
    track.style.setProperty("--stage-h", `${stage.offsetHeight}px`);
    track.style.setProperty("--steps", String(Math.max(phases.length - 1, 1)));
  };

  const syncPhases = () => {
    if (!track?.classList.contains("is-pinned") || !stage) return;
    const pinTop = parseFloat(getComputedStyle(stage).top) || 0;
    const consumed = pinTop - (track.getBoundingClientRect().top - dialog.getBoundingClientRect().top);
    const range = Math.max(track.offsetHeight - stage.offsetHeight, 1);
    const progress = Math.min(1, Math.max(0, consumed / range));
    const index = Math.min(phases.length - 1, Math.floor(progress * phases.length));
    const visible = stageVisible();
    const entered = visible && !stageWasVisible;
    stageWasVisible = visible;
    if (!visible) phases.forEach((phase) => phase.querySelector("video")?.pause());
    if (index === activePhase && !entered) return;
    activePhase = index;
    phases.forEach((phase, i) => {
      const on = i === index;
      phase.classList.toggle("is-active", on);
      phase.toggleAttribute("inert", !on);
      const video = phase.querySelector("video");
      if (!video) return;
      if (on && visible && !reduceMotion) video.play().catch(() => {});
      else video.pause();
    });
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
    if (live && visible) live.textContent = phases[index]?.querySelector("h3")?.textContent || "";
  };

  const onScroll = () => syncPhases();

  const open = () => {
    if (dialog.open) return;
    lockPage(true);
    dialog.showModal();
    dialog.scrollTop = 0;
    dialog.classList.add("is-open");
    layoutPhases();
    syncPhases();
    requestAnimationFrame(startPlayback);
  };

  const close = () => {
    if (!dialog.open) return;
    videos.forEach((video) => video.pause());
    dialog.classList.remove("is-open");
    dialog.close();
    lockPage(Boolean(document.querySelector("dialog[open]")));
    trigger.focus({ preventScroll: true });
  };

  trigger.addEventListener("click", open);
  dialog.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    if (!dialog.open) return;
    layoutPhases();
    syncPhases();
    startPlayback();
  });
  dialog.querySelector("[data-case-close]")?.addEventListener("click", close);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => {
    videos.forEach((video) => video.pause());
    dialog.classList.remove("is-open");
    lockPage(Boolean(document.querySelector("dialog[open]")));
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document.querySelectorAll("details.role[open]").forEach((details) => {
    details.removeAttribute("open");
    details.querySelector("summary")?.focus();
  });
});
