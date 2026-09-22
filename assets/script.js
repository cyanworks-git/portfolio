const dockHeader = document.querySelector('.dock-header');
const topHeader = document.querySelector('.top-header');
const dockLinks = dockHeader.querySelectorAll('a');
const topLinks = topHeader.querySelectorAll('a');
const sectionIds = ['profile', 'branding', 'team-projects', 'works', 'contact'];
const lightbox = document.querySelector('.lightbox');
const lightboxImage = lightbox?.querySelector('img');
const lightboxVideo = lightbox?.querySelector('.lightbox__video');
const lightboxViewport = lightbox?.querySelector('.lightbox__viewport');
const lightboxTitle = lightbox?.querySelector('.lightbox__title');
const lightboxClose = lightbox?.querySelector('.lightbox__close');
const lightboxFullscreen = lightbox?.querySelector('.lightbox__fullscreen');
const lightboxFullscreenControls = lightbox?.querySelector(
  '.lightbox__fullscreen-controls',
);
const lightboxFullscreenPrevious = lightbox?.querySelector(
  '.lightbox__fullscreen-nav--prev',
);
const lightboxFullscreenNext = lightbox?.querySelector(
  '.lightbox__fullscreen-nav--next',
);
const lightboxFullscreenClose = lightbox?.querySelector(
  '.lightbox__fullscreen-close',
);
const lightboxFullscreenPage = lightbox?.querySelector(
  '.lightbox__fullscreen-page',
);
const lightboxPrevious = lightbox?.querySelector('.lightbox__nav--prev');
const lightboxNext = lightbox?.querySelector('.lightbox__nav--next');
const lightboxPointers = new Map();
const lightboxPan = { x: 0, y: 0 };
const lightboxLoadedImages = new Set();
let lightboxZoom = 1;
let lightboxDragStart = null;
let lightboxSwipeStart = null;
let lightboxPinchStart = null;
let lightboxRequestId = 0;
let lightboxGroup = [];
let lightboxIndex = -1;
let lightboxDisplayedIndex = -1;
let lightboxReturnFocus = null;
let lightboxMode = 'image';
let lightboxControlsHideTimer = null;
const resourceCards = document.querySelectorAll('[data-lightbox-src]');
const resourceCarousels = document.querySelectorAll('.resource-carousel');
const guidebookTriggers = document.querySelectorAll('[data-guidebook]');
const mobileMenu = document.querySelector('.mobile-menu');
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const mobileMenuLinks = mobileMenu?.querySelectorAll('a');
const worksTabButtons = document.querySelectorAll('[data-works-tab]');
const worksFiles = document.querySelectorAll('[data-works-type]');
const worksTabs = document.querySelector('.works-tabs');
const worksPanel = document.querySelector('#works-panel');
const hero = document.querySelector('.hero');
const heroIntro = document.querySelector('[data-hero-intro]');
const heroLogo = document.querySelector('[data-hero-logo]');
document.querySelectorAll('[data-profile-image]').forEach((image) => {
  const removeOnError = () => image.remove();
  image.addEventListener('error', removeOnError, { once: true });
  if (image.complete && image.naturalWidth === 0) removeOnError();
});

function updateHeaders() {
  const firstSection = document.querySelector('#profile');
  const sectionHasEntered = firstSection
    ? firstSection.getBoundingClientRect().top < window.innerHeight
    : window.scrollY > 0;
  const onHero = !sectionHasEntered;
  dockHeader.classList.toggle('is-visible', onHero);
  dockHeader.classList.toggle('is-hidden', !onHero);
  topHeader.classList.toggle('is-visible', !onHero);
  topHeader.classList.toggle('is-hidden', onHero);
  dockHeader.setAttribute('aria-hidden', String(!onHero));
  topHeader.setAttribute('aria-hidden', String(onHero));
  dockLinks.forEach((link) => {
    link.tabIndex = onHero ? 0 : -1;
  });
  topLinks.forEach((link) => {
    link.tabIndex = onHero ? -1 : 0;
  });
  if (mobileMenuToggle) mobileMenuToggle.tabIndex = onHero ? -1 : 0;

  const probe = window.innerHeight * 0.34;
  const activeId =
    sectionIds.find((id) => {
      const section = document.getElementById(id);
      if (!section) return false;
      const rect = section.getBoundingClientRect();
      return rect.top <= probe && rect.bottom > probe;
    }) ||
    sectionIds.find((id) => {
      const section = document.getElementById(id);
      if (!section) return false;
      const rect = section.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    });

  [...dockLinks, ...topLinks].forEach((link) => {
    const isActive =
      Boolean(activeId) && link.getAttribute('href') === `#${activeId}`;
    link.classList.toggle('is-active', isActive);
    if (link.closest('.top-nav')) {
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  });
}

updateHeaders();
window.addEventListener('scroll', updateHeaders, { passive: true });
window.addEventListener('resize', updateHeaders);

if (heroIntro && hero) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroIntro.classList.remove('is-active');
    heroLogo?.classList.add('is-visible');
  }
  heroIntro.addEventListener('animationend', (event) => {
    if (event.animationName === 'hero-intro-fade') {
      heroIntro.classList.remove('is-active');
    }
  });
}

function setMobileMenu(open) {
  if (!mobileMenu || !mobileMenuToggle) return;
  mobileMenu.classList.toggle('is-open', open);
  topHeader.classList.toggle('is-menu-open', open);
  mobileMenu.setAttribute('aria-hidden', String(!open));
  mobileMenuToggle.setAttribute('aria-expanded', String(open));
  mobileMenuToggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  mobileMenuLinks?.forEach((link) => {
    link.tabIndex = open ? 0 : -1;
  });
  document.body.style.overflow = open ? 'hidden' : '';
}

mobileMenuToggle?.addEventListener('click', () =>
  setMobileMenu(!mobileMenu?.classList.contains('is-open')),
);
mobileMenuLinks?.forEach((link) =>
  link.addEventListener('click', () => setMobileMenu(false)),
);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMobileMenu(false);
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 640) setMobileMenu(false);
});

resourceCarousels.forEach((carousel) => {
  const gallery = carousel.querySelector('.resource-gallery');
  const previous = carousel.querySelector('.resource-nav--prev');
  const next = carousel.querySelector('.resource-nav--next');
  if (!gallery || !previous || !next) return;
  const updateControls = () => {
    const atStart = gallery.scrollLeft <= 8;
    const atEnd =
      gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth - 8;
    previous.classList.toggle('is-hidden', atStart);
    next.classList.toggle('is-hidden', atEnd);
  };
  const scrollByPage = (direction) => {
    const firstCard = gallery.querySelector('.resource-card');
    if (!firstCard) return;
    const gap =
      Number.parseFloat(window.getComputedStyle(gallery).columnGap) || 0;
    const cardStep = firstCard.getBoundingClientRect().width + gap;
    const cardsPerPage = Math.max(
      1,
      Math.floor(gallery.clientWidth / cardStep),
    );
    const pageWidth = cardsPerPage * cardStep;
    const page = Math.round(gallery.scrollLeft / pageWidth) + direction;
    const maxScroll = gallery.scrollWidth - gallery.clientWidth;
    gallery.scrollTo({
      left: Math.min(maxScroll, Math.max(0, page * pageWidth)),
      behavior: 'smooth',
    });
  };
  const handleWheel = (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    const maxScroll = gallery.scrollWidth - gallery.clientWidth;
    const nextScroll = Math.min(
      maxScroll,
      Math.max(0, gallery.scrollLeft + event.deltaY),
    );
    if (nextScroll === gallery.scrollLeft) return;
    event.preventDefault();
    gallery.scrollLeft = nextScroll;
  };
  previous.addEventListener('click', () => scrollByPage(-1));
  next.addEventListener('click', () => scrollByPage(1));
  gallery.addEventListener('scroll', updateControls, { passive: true });
  gallery.addEventListener('wheel', handleWheel, { passive: false });
  window.addEventListener('resize', updateControls);
  updateControls();
});

function updateWorksTab(type) {
  worksTabs?.classList.toggle('works-tabs--photo', type === 'photo');
  worksTabs?.classList.toggle('works-tabs--video', type === 'video');
  worksTabButtons.forEach((button) => {
    const isActive = button.dataset.worksTab === type;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
    button.tabIndex = isActive ? 0 : -1;
    if (isActive && worksPanel && button.id) {
      worksPanel.setAttribute('aria-labelledby', button.id);
    }
  });
  worksFiles.forEach((file) => {
    file.toggleAttribute('hidden', file.dataset.worksType !== type);
  });
}

worksTabButtons.forEach((button) => {
  button.addEventListener('click', () =>
    updateWorksTab(button.dataset.worksTab || 'photo'),
  );
  button.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...worksTabButtons];
    const currentIndex = tabs.indexOf(button);
    const targetIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (currentIndex +
              (event.key === 'ArrowRight' ? 1 : -1) +
              tabs.length) %
            tabs.length;
    const target = tabs[targetIndex];
    updateWorksTab(target.dataset.worksTab || 'photo');
    target.focus();
  });
});
updateWorksTab('photo');

function isVideoCard(card) {
  const source = card?.dataset.lightboxSrc || '';
  return (
    card?.dataset.lightboxType === 'video' ||
    /\.(?:mp4|webm|ogg|mov)(?:[?#].*)?$/i.test(source)
  );
}

function stopLightboxVideo() {
  if (!lightboxVideo) return;
  lightboxVideo.pause();
  lightboxVideo.onloadeddata = null;
  lightboxVideo.onerror = null;
  lightboxVideo.removeAttribute('src');
  lightboxVideo.removeAttribute('aria-label');
  lightboxVideo.classList.remove('is-ready');
  lightboxVideo.load();
}

function getNativeFullscreenElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement
  );
}

function isLightboxFullscreen() {
  return (
    lightbox?.classList.contains('is-fullscreen-fallback') ||
    getNativeFullscreenElement() === lightbox
  );
}

function updateFullscreenButton() {
  if (!lightboxFullscreen) return;
  const isFullscreen = isLightboxFullscreen();
  lightboxFullscreen.innerHTML = `<span aria-hidden="true">${isFullscreen ? '↙' : '↗'}</span> ${isFullscreen ? '전체화면 닫기' : '전체화면 보기'}`;
  lightboxFullscreen.setAttribute(
    'aria-label',
    isFullscreen ? '전체화면 닫기' : '전체화면 보기',
  );
}

function handleNativeFullscreenChange() {
  const nativeFullscreenElement = getNativeFullscreenElement();
  if (lightbox?.classList.contains('is-open')) {
    if (nativeFullscreenElement === lightbox) {
      lightbox.classList.add('is-fullscreen-fallback');
    } else if (!nativeFullscreenElement) {
      lightbox.classList.remove('is-fullscreen-fallback');
    }
  }
  updateFullscreenButton();
  if (nativeFullscreenElement === lightbox) showFullscreenControls();
}

function updateFullscreenControls() {
  if (lightboxFullscreenPage) {
    const displayedIndex =
      lightboxDisplayedIndex >= 0 ? lightboxDisplayedIndex : lightboxIndex;
    lightboxFullscreenPage.textContent =
      lightboxMode === 'guidebook'
        ? `${displayedIndex + 1} / ${lightboxGroup.length}`
        : '';
  }
  if (lightboxFullscreenPrevious) {
    lightboxFullscreenPrevious.disabled =
      lightboxIndex <= 0 || lightboxGroup.length <= 1;
  }
  if (lightboxFullscreenNext) {
    lightboxFullscreenNext.disabled =
      lightboxIndex < 0 || lightboxIndex >= lightboxGroup.length - 1;
  }
}

function hideFullscreenControls() {
  if (lightboxControlsHideTimer) {
    window.clearTimeout(lightboxControlsHideTimer);
    lightboxControlsHideTimer = null;
  }
  lightbox?.classList.remove('is-controls-visible');
}

function showFullscreenControls() {
  if (!lightbox || !isLightboxFullscreen()) return;
  lightbox.classList.add('is-controls-visible');
  if (lightboxControlsHideTimer) {
    window.clearTimeout(lightboxControlsHideTimer);
  }
  lightboxControlsHideTimer = window.setTimeout(() => {
    if (!lightboxFullscreenControls?.matches(':focus-within')) {
      lightbox.classList.remove('is-controls-visible');
    }
    lightboxControlsHideTimer = null;
  }, 1800);
}

async function exitLightboxFullscreen() {
  if (getNativeFullscreenElement() === lightbox) {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    lightbox.classList.remove('is-fullscreen-fallback');
  } else if (lightbox?.classList.contains('is-fullscreen-fallback')) {
    lightbox.classList.remove('is-fullscreen-fallback');
  }
  hideFullscreenControls();
  updateFullscreenButton();
}

async function toggleLightboxFullscreen() {
  if (!lightbox?.classList.contains('is-guidebook')) return;
  if (isLightboxFullscreen()) {
    await exitLightboxFullscreen();
    return;
  }
  lightboxZoom = 1;
  lightboxPan.x = 0;
  lightboxPan.y = 0;
  lightbox.classList.remove('is-zoomed', 'is-panning');
  lightbox.classList.add('is-fullscreen-fallback');
  if (lightboxImage) lightboxImage.style.transform = '';
  try {
    if (lightbox.requestFullscreen) {
      await lightbox.requestFullscreen();
      updateFullscreenButton();
      showFullscreenControls();
      return;
    }
    if (lightbox.webkitRequestFullscreen) {
      lightbox.webkitRequestFullscreen();
      updateFullscreenButton();
      showFullscreenControls();
      return;
    }
    if (lightbox.mozRequestFullScreen) {
      lightbox.mozRequestFullScreen();
      updateFullscreenButton();
      showFullscreenControls();
      return;
    }
  } catch {
    // iOS Safari and other browsers may reject fullscreen for non-video elements.
  }
  updateFullscreenButton();
  showFullscreenControls();
}

function closeLightbox() {
  if (!lightbox || !lightboxImage || !lightbox.classList.contains('is-open'))
    return;
  const returnFocus = lightboxReturnFocus;
  lightboxReturnFocus = null;
  lightboxRequestId += 1;
  lightbox.classList.remove('is-open');
  lightbox.classList.remove('is-loading');
  lightbox.classList.remove(
    'is-zoomed',
    'is-panning',
    'is-video',
    'is-guidebook',
    'is-fullscreen-fallback',
    'has-resource-nav',
  );
  hideFullscreenControls();
  void exitLightboxFullscreen();
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxImage.onload = null;
  lightboxImage.onerror = null;
  lightboxImage.removeAttribute('src');
  lightboxImage.classList.remove('is-ready');
  stopLightboxVideo();
  if (lightboxTitle) lightboxTitle.textContent = '';
  lightboxViewport?.scrollTo({ top: 0, left: 0 });
  lightboxPointers.clear();
  lightboxDragStart = null;
  lightboxSwipeStart = null;
  lightboxPinchStart = null;
  lightboxZoom = 1;
  lightboxPan.x = 0;
  lightboxPan.y = 0;
  lightboxGroup = [];
  lightboxIndex = -1;
  lightboxDisplayedIndex = -1;
  lightboxMode = 'image';
  updateFullscreenButton();
  updateFullscreenControls();
  if (lightboxPrevious) lightboxPrevious.disabled = true;
  if (lightboxNext) lightboxNext.disabled = true;
  if (lightboxImage) lightboxImage.style.transform = '';
  document.body.style.overflow = '';
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
}

function clampLightboxPan() {
  if (!lightboxViewport || !lightboxImage) return;
  const maxX = Math.max(
    0,
    (lightboxImage.offsetWidth * lightboxZoom - lightboxViewport.clientWidth) /
      2,
  );
  const maxY = Math.max(
    0,
    (lightboxImage.offsetHeight * lightboxZoom -
      lightboxViewport.clientHeight) /
      2,
  );
  lightboxPan.x = Math.min(maxX, Math.max(-maxX, lightboxPan.x));
  lightboxPan.y = Math.min(maxY, Math.max(-maxY, lightboxPan.y));
}

function applyLightboxTransform() {
  if (!lightbox || !lightboxImage) return;
  clampLightboxPan();
  lightbox.classList.toggle('is-zoomed', lightboxZoom > 1.001);
  lightboxImage.style.transform = `translate(${lightboxPan.x}px, ${lightboxPan.y}px) scale(${lightboxZoom})`;
}

function setLightboxZoom(nextZoom, clientX, clientY) {
  if (
    !lightbox ||
    !lightboxImage ||
    !lightboxViewport ||
    lightbox.classList.contains('is-video')
  )
    return;
  const clampedZoom = Math.min(4, Math.max(1, nextZoom));
  const previousZoom = lightboxZoom;

  if (clampedZoom <= 1.001) {
    lightboxZoom = 1;
    lightboxPan.x = 0;
    lightboxPan.y = 0;
    lightbox.classList.remove('is-zoomed');
    applyLightboxTransform();
    return;
  }

  if (previousZoom <= 1.001) lightbox.classList.add('is-zoomed');
  const viewportRect = lightboxViewport.getBoundingClientRect();
  const anchorX =
    (clientX ?? viewportRect.left + viewportRect.width / 2) -
    viewportRect.left -
    viewportRect.width / 2;
  const anchorY =
    (clientY ?? viewportRect.top + viewportRect.height / 2) -
    viewportRect.top -
    viewportRect.height / 2;
  lightboxPan.x =
    anchorX - ((anchorX - lightboxPan.x) / previousZoom) * clampedZoom;
  lightboxPan.y =
    anchorY - ((anchorY - lightboxPan.y) / previousZoom) * clampedZoom;
  lightboxZoom = clampedZoom;
  applyLightboxTransform();
}

function panLightbox(deltaX, deltaY) {
  if (lightbox?.classList.contains('is-video') || lightboxZoom <= 1.001) return;
  lightboxPan.x += deltaX;
  lightboxPan.y += deltaY;
  applyLightboxTransform();
}

function pointerMidpoint(first, second) {
  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2,
  };
}

function pointerDistance(first, second) {
  return Math.hypot(
    first.clientX - second.clientX,
    first.clientY - second.clientY,
  );
}

function handleLightboxPointerDown(event) {
  if (!lightboxViewport || lightbox.classList.contains('is-loading')) return;
  if (lightbox.classList.contains('is-video')) {
    if (event.pointerType === 'touch') {
      lightboxSwipeStart = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
    }
    return;
  }
  lightboxPointers.set(event.pointerId, {
    clientX: event.clientX,
    clientY: event.clientY,
  });
  lightboxViewport.setPointerCapture?.(event.pointerId);

  if (lightboxPointers.size === 2) {
    const [first, second] = [...lightboxPointers.values()];
    lightboxPinchStart = {
      distance: pointerDistance(first, second),
      midpoint: pointerMidpoint(first, second),
    };
    lightboxDragStart = null;
    lightboxSwipeStart = null;
    lightbox.classList.remove('is-panning');
  } else if (lightboxZoom > 1.001) {
    lightboxDragStart = {
      x: event.clientX,
      y: event.clientY,
      panX: lightboxPan.x,
      panY: lightboxPan.y,
    };
    lightbox.classList.add('is-panning');
  } else if (event.pointerType === 'touch') {
    lightboxSwipeStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }
}

function handleLightboxPointerMove(event) {
  if (lightbox?.classList.contains('is-video')) return;
  if (!lightboxPointers.has(event.pointerId)) return;
  lightboxPointers.set(event.pointerId, {
    clientX: event.clientX,
    clientY: event.clientY,
  });

  if (lightboxPointers.size >= 2 && lightboxPinchStart) {
    const [first, second] = [...lightboxPointers.values()];
    const midpoint = pointerMidpoint(first, second);
    const distance = Math.max(1, pointerDistance(first, second));
    setLightboxZoom(
      lightboxZoom * (distance / lightboxPinchStart.distance),
      midpoint.x,
      midpoint.y,
    );
    panLightbox(
      midpoint.x - lightboxPinchStart.midpoint.x,
      midpoint.y - lightboxPinchStart.midpoint.y,
    );
    lightboxPinchStart = { distance, midpoint };
    event.preventDefault();
    return;
  }

  if (lightboxDragStart && lightboxZoom > 1.001) {
    lightboxPan.x =
      lightboxDragStart.panX + event.clientX - lightboxDragStart.x;
    lightboxPan.y =
      lightboxDragStart.panY + event.clientY - lightboxDragStart.y;
    applyLightboxTransform();
    event.preventDefault();
  }
}

function handleLightboxPointerUp(event) {
  const swipeStart =
    lightboxSwipeStart?.pointerId === event.pointerId
      ? lightboxSwipeStart
      : null;
  lightboxPointers.delete(event.pointerId);
  lightboxViewport?.releasePointerCapture?.(event.pointerId);
  lightboxSwipeStart = null;

  if (
    swipeStart &&
    lightboxPointers.size === 0 &&
    lightboxZoom <= 1.001 &&
    lightboxGroup.length > 1
  ) {
    const deltaX = event.clientX - swipeStart.x;
    const deltaY = event.clientY - swipeStart.y;
    if (Math.abs(deltaX) >= 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      navigateLightbox(deltaX < 0 ? 1 : -1);
    }
  }

  if (lightboxPointers.size < 2) lightboxPinchStart = null;
  if (lightboxPointers.size === 1 && lightboxZoom > 1.001) {
    const [remaining] = [...lightboxPointers.values()];
    lightboxDragStart = {
      x: remaining.clientX,
      y: remaining.clientY,
      panX: lightboxPan.x,
      panY: lightboxPan.y,
    };
  } else {
    lightboxDragStart = null;
    lightbox.classList.remove('is-panning');
  }
}

function updateLightboxNavigation() {
  const hasResourceNavigation = lightboxGroup.length > 1;
  lightbox?.classList.toggle('has-resource-nav', hasResourceNavigation);
  if (lightboxPrevious) {
    lightboxPrevious.disabled = !hasResourceNavigation || lightboxIndex <= 0;
  }
  if (lightboxNext) {
    lightboxNext.disabled =
      !hasResourceNavigation || lightboxIndex >= lightboxGroup.length - 1;
  }
  updateFullscreenControls();
}

function commitLightboxContent(contentLabel, source) {
  if (!lightboxImage) return;
  lightboxDisplayedIndex = lightboxIndex;
  lightboxImage.alt = contentLabel;
  if (lightboxTitle) {
    lightboxTitle.textContent =
      lightboxMode === 'guidebook'
        ? `${lightboxIndex + 1} / ${lightboxGroup.length}`
        : contentLabel;
  }
  updateFullscreenControls();
  if (source) lightboxImage.src = source;
}

function showLightboxCard(card) {
  if (!lightbox || !lightboxImage || !lightboxVideo) return;
  const originalSrc = card?.dataset.lightboxSrc;
  if (!originalSrc) return;
  const videoCard = isVideoCard(card);
  const keepCurrentImage =
    !videoCard &&
    lightboxImage.classList.contains('is-ready') &&
    Boolean(lightboxImage.getAttribute('src'));
  const preview = card.querySelector?.('img');
  const previewSrc =
    !videoCard && !keepCurrentImage
      ? preview?.currentSrc || preview?.getAttribute('src')
      : '';
  const contentLabel = card.dataset.lightboxAlt || '';

  updateFullscreenControls();
  lightbox.classList.add('is-open', 'is-loading');
  lightbox.classList.remove('is-zoomed', 'is-panning');
  lightbox.classList.toggle('is-video', videoCard);
  lightbox.classList.toggle('is-guidebook', lightboxMode === 'guidebook');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  lightboxZoom = 1;
  lightboxPan.x = 0;
  lightboxPan.y = 0;
  lightboxImage.style.transform = '';
  if (!keepCurrentImage) {
    lightboxImage.alt = '';
    lightboxImage.classList.remove('is-ready');
    lightboxImage.removeAttribute('src');
    if (previewSrc) {
      lightboxImage.src = previewSrc;
      lightboxImage.classList.add('is-ready');
    }
  }
  stopLightboxVideo();

  const requestId = ++lightboxRequestId;
  if (videoCard) {
    lightboxVideo.setAttribute('aria-label', contentLabel || '동영상');
    lightboxVideo.onloadeddata = () => {
      if (
        requestId !== lightboxRequestId ||
        !lightbox.classList.contains('is-open')
      )
        return;
      commitLightboxContent(contentLabel);
      lightboxVideo.classList.add('is-ready');
      lightbox.classList.remove('is-loading');
      lightboxVideo.play().catch(() => {});
    };
    lightboxVideo.onerror = () => {
      if (requestId !== lightboxRequestId) return;
      lightbox.classList.remove('is-loading');
    };
    lightboxVideo.src = originalSrc;
    lightboxVideo.load();
    lightboxVideo.play().catch(() => {});
    return;
  }

  const preload = new Image();
  preload.decoding = 'async';
  if (lightboxLoadedImages.has(originalSrc)) {
    commitLightboxContent(contentLabel, originalSrc);
    lightboxImage.classList.add('is-ready');
    lightbox.classList.remove('is-loading');
    return;
  }
  preload.onload = async () => {
    try {
      if (preload.decode) await preload.decode();
    } catch {
      // The load event is still a valid fallback when decoding is unavailable.
    }
    lightboxLoadedImages.add(originalSrc);
    if (
      requestId !== lightboxRequestId ||
      !lightbox.classList.contains('is-open')
    )
      return;
    commitLightboxContent(contentLabel, originalSrc);
    lightboxImage.classList.add('is-ready');
    lightbox.classList.remove('is-loading');
  };
  preload.onerror = () => {
    if (requestId !== lightboxRequestId) return;
    lightbox.classList.remove('is-loading');
  };
  preload.src = originalSrc;
}

function navigateLightbox(direction) {
  if (
    !lightbox?.classList.contains('has-resource-nav') ||
    lightbox.classList.contains('is-zoomed')
  )
    return;
  const nextIndex = lightboxIndex + direction;
  if (nextIndex < 0 || nextIndex >= lightboxGroup.length) return;
  lightboxIndex = nextIndex;
  updateLightboxNavigation();
  showLightboxCard(lightboxGroup[lightboxIndex]);
}

function openGuidebook(trigger) {
  const totalPages = Number.parseInt(trigger.dataset.guidebookPages || '', 10);
  const filePrefix = trigger.dataset.guidebook;
  if (!filePrefix || !Number.isInteger(totalPages) || totalPages < 1) return;

  const label = trigger.dataset.guidebookLabel || '가이드북';
  const guidebookDirectory =
    { baedalio: 'bdio', unpeacefes: 'unpeace' }[filePrefix] || filePrefix;
  lightboxMode = 'guidebook';
  lightboxReturnFocus = trigger;
  lightboxGroup = Array.from({ length: totalPages }, (_, index) => {
    const pageNumber = index + 1;
    const paddedPageNumber = String(pageNumber).padStart(2, '0');
    return {
      dataset: {
        lightboxSrc: `assets/images/guidebook/${guidebookDirectory}/${paddedPageNumber}.webp`,
        lightboxAlt: `${label} ${pageNumber}쪽`,
      },
    };
  });
  lightboxIndex = 0;
  updateLightboxNavigation();
  showLightboxCard(lightboxGroup[lightboxIndex]);
  lightboxClose?.focus({ preventScroll: true });
}

guidebookTriggers.forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    openGuidebook(trigger);
  });
});

resourceCards.forEach((card) => {
  card.addEventListener('click', () => {
    lightboxMode = 'image';
    lightboxReturnFocus = card;
    const resourceCarousel = card.closest('.resource-carousel');
    const worksType = card.dataset.worksType;
    lightboxGroup = resourceCarousel
      ? [...resourceCarousel.querySelectorAll('[data-lightbox-src]')]
      : worksType
        ? [...worksFiles].filter((file) => file.dataset.worksType === worksType)
        : [card];
    lightboxIndex = lightboxGroup.indexOf(card);
    updateLightboxNavigation();
    showLightboxCard(card);
    lightboxClose?.focus({ preventScroll: true });
  });
});

lightboxPrevious?.addEventListener('click', (event) => {
  event.stopPropagation();
  navigateLightbox(-1);
});
lightboxNext?.addEventListener('click', (event) => {
  event.stopPropagation();
  navigateLightbox(1);
});
lightboxPrevious?.addEventListener('pointerdown', (event) =>
  event.stopPropagation(),
);
lightboxNext?.addEventListener('pointerdown', (event) =>
  event.stopPropagation(),
);
lightboxFullscreenPrevious?.addEventListener('pointerdown', (event) =>
  event.stopPropagation(),
);
lightboxFullscreenNext?.addEventListener('pointerdown', (event) =>
  event.stopPropagation(),
);
lightboxFullscreenClose?.addEventListener('pointerdown', (event) =>
  event.stopPropagation(),
);
lightboxFullscreenPrevious?.addEventListener('click', (event) => {
  event.stopPropagation();
  navigateLightbox(-1);
});
lightboxFullscreenNext?.addEventListener('click', (event) => {
  event.stopPropagation();
  navigateLightbox(1);
});
lightboxFullscreenClose?.addEventListener('click', (event) => {
  event.stopPropagation();
  void exitLightboxFullscreen();
});

lightbox?.addEventListener(
  'wheel',
  (event) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      if (
        lightbox.classList.contains('is-video') ||
        lightbox.classList.contains('is-loading')
      )
        return;
      setLightboxZoom(
        lightboxZoom * Math.exp(-event.deltaY * 0.0025),
        event.clientX,
        event.clientY,
      );
      return;
    }

    event.preventDefault();
    if (
      !lightbox.classList.contains('is-video') &&
      event.target.closest?.('.lightbox__viewport') &&
      lightboxZoom > 1.001
    ) {
      panLightbox(-event.deltaX, -event.deltaY);
      return;
    }

    if (event.target.closest?.('.lightbox__fullscreen-controls')) return;
    const scrollDelta =
      Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX;
    if (scrollDelta !== 0) {
      navigateLightbox(scrollDelta > 0 ? 1 : -1);
    }
  },
  { passive: false },
);
lightboxViewport?.addEventListener('pointerdown', handleLightboxPointerDown);
lightboxViewport?.addEventListener('pointermove', handleLightboxPointerMove);
lightboxViewport?.addEventListener('pointerup', handleLightboxPointerUp);
lightboxViewport?.addEventListener('pointercancel', handleLightboxPointerUp);

lightboxClose?.addEventListener('pointerdown', (event) =>
  event.stopPropagation(),
);
lightboxClose?.addEventListener('click', (event) => {
  event.stopPropagation();
  closeLightbox();
});
lightboxFullscreen?.addEventListener('pointerdown', (event) =>
  event.stopPropagation(),
);
lightboxFullscreen?.addEventListener('click', (event) => {
  event.stopPropagation();
  void toggleLightboxFullscreen();
});
document.addEventListener('fullscreenchange', handleNativeFullscreenChange);
document.addEventListener(
  'webkitfullscreenchange',
  handleNativeFullscreenChange,
);
document.addEventListener('mozfullscreenchange', handleNativeFullscreenChange);
lightbox?.addEventListener('pointermove', showFullscreenControls, {
  passive: true,
});
lightbox?.addEventListener('pointerdown', showFullscreenControls, {
  passive: true,
});
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});
window.addEventListener('keydown', (event) => {
  if (!lightbox?.classList.contains('is-open')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    if (isLightboxFullscreen()) {
      void exitLightboxFullscreen();
      return;
    }
    closeLightbox();
  }
  if (event.key === 'ArrowLeft') {
    if (document.activeElement === lightboxVideo) return;
    event.preventDefault();
    navigateLightbox(-1);
  }
  if (event.key === 'ArrowRight') {
    if (document.activeElement === lightboxVideo) return;
    event.preventDefault();
    navigateLightbox(1);
  }
  if (event.key === 'Tab') {
    const focusable = [
      lightboxPrevious,
      lightboxVideo,
      lightboxFullscreen,
      lightboxNext,
      lightboxClose,
    ].filter(
      (element) =>
        element && !element.disabled && element.offsetParent !== null,
    );
    if (!focusable.length) return;
    const currentIndex = focusable.indexOf(document.activeElement);
    const nextIndex = event.shiftKey
      ? currentIndex <= 0
        ? focusable.length - 1
        : currentIndex - 1
      : currentIndex === focusable.length - 1
        ? 0
        : currentIndex + 1;
    event.preventDefault();
    focusable[nextIndex].focus();
  }
});
