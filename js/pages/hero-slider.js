
document.addEventListener('DOMContentLoaded', () => {
  const viewport = document.getElementById('hero-slider');
  const track = document.getElementById('hero-slider-track');
  if (!track || !viewport) return;

  const slides = track.querySelectorAll('.hero-slide');
  const totalSlides = slides.length;
  let currentIndex = 0;
  let autoplayTimer = null;

  track.style.transition = 'transform 0.7s ease-in-out';

  function goToSlide(index) {
    currentIndex = (index + totalSlides) % totalSlides;
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
  }

  function nextSlide() {
    goToSlide(currentIndex + 1);
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(nextSlide, 3500);
  }

  function stopAutoplay() {
    if (autoplayTimer) clearInterval(autoplayTimer);
  }

  // ── Drag / swipe support ──
  let isDragging = false;
  let startX = 0;

  function dragStart(x) {
    isDragging = true;
    startX = x;
    stopAutoplay();
    track.style.transition = 'none'; // no animation while actively dragging
  }

  function dragMove(x) {
    if (!isDragging) return;
    const deltaX = x - startX;
    const dragPercent = (deltaX / viewport.offsetWidth) * 100;
    track.style.transform = `translateX(calc(-${currentIndex * 100}% + ${dragPercent}%))`;
  }

  function dragEnd(x) {
    if (!isDragging) return;
    isDragging = false;
    track.style.transition = 'transform 0.7s ease-in-out'; // animation back on

    const deltaX = x - startX;
    const threshold = viewport.offsetWidth * 0.15; // must drag at least 15% of width to count

    if (deltaX < -threshold) {
      goToSlide(currentIndex + 1); // dragged left → next slide
    } else if (deltaX > threshold) {
      goToSlide(currentIndex - 1); // dragged right → previous slide
    } else {
      goToSlide(currentIndex); // snap back to same slide
    }

    startAutoplay();
  }

  // Touch events (mobile)
  viewport.addEventListener('touchstart', (e) => dragStart(e.touches[0].clientX));
  viewport.addEventListener('touchmove', (e) => dragMove(e.touches[0].clientX));
  viewport.addEventListener('touchend', (e) => dragEnd(e.changedTouches[0].clientX));

  // Mouse events (desktop)
  viewport.addEventListener('mousedown', (e) => dragStart(e.clientX));
  viewport.addEventListener('mousemove', (e) => dragMove(e.clientX));
  viewport.addEventListener('mouseup', (e) => dragEnd(e.clientX));
  viewport.addEventListener('mouseleave', (e) => {
    if (isDragging) dragEnd(e.clientX);
  });

  startAutoplay();
});