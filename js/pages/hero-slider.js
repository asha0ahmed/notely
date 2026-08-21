document.addEventListener('DOMContentLoaded', () => {
  const viewport = document.getElementById('hero-slider');
  const track = document.getElementById('hero-slider-track');
  if (!track || !viewport) return;

  const slides = track.querySelectorAll('.hero-slide');
  const totalSlides = slides.length;
  let currentIndex = 0;
  let autoplayTimer = null;

  // instantly place a slide at a starting position, no animation
  function placeInstant(slide, className) {
    slide.style.transition = 'none';
    slide.classList.remove('pos-left', 'pos-center', 'pos-right');
    slide.classList.add(className);
    void slide.offsetWidth; // forces the browser to apply the position now
    slide.style.transition = '';
  }

  // direction: 1 = forward (next), -1 = backward (previous)
  function showSlide(index, direction) {
    const nextIndex = (index + totalSlides) % totalSlides;
    if (nextIndex === currentIndex) return;

    const currentSlide = slides[currentIndex];
    const nextSlide = slides[nextIndex];

    // put the incoming slide on the correct side BEFORE animating
    placeInstant(nextSlide, direction === 1 ? 'pos-right' : 'pos-left');

    requestAnimationFrame(() => {
      currentSlide.classList.remove('pos-center');
      currentSlide.classList.add(direction === 1 ? 'pos-left' : 'pos-right');

      nextSlide.classList.remove('pos-left', 'pos-right');
      nextSlide.classList.add('pos-center');
    });

    currentIndex = nextIndex;
  }

  function nextSlide() {
    showSlide(currentIndex + 1, 1);
  }

  function prevSlide() {
    showSlide(currentIndex - 1, -1);
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(nextSlide, 3500);
  }

  function stopAutoplay() {
    if (autoplayTimer) clearInterval(autoplayTimer);
  }

  // ── Swipe support ──
  let startX = 0;
  let isSwiping = false;

  viewport.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isSwiping = true;
    stopAutoplay();
  });

  viewport.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    isSwiping = false;

    const deltaX = e.changedTouches[0].clientX - startX;
    const threshold = 40;

    if (deltaX < -threshold) {
      nextSlide(); // swiped left → next
    } else if (deltaX > threshold) {
      prevSlide(); // swiped right → previous
    }

    startAutoplay();
  });

  // start with the first slide visible, others parked to the right
  slides.forEach((slide, i) => {
    placeInstant(slide, i === 0 ? 'pos-center' : 'pos-right');
  });

  startAutoplay();
});