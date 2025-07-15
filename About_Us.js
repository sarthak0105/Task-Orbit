// Detect when sections are visible in the viewport and apply animations
const sections = document.querySelectorAll('.hidden-section');

const options = {
  root: null,
  threshold: 0.1,
  rootMargin: '0px'
};

const observer = new IntersectionObserver(function(entries, observer) {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible-section');
    }
  });
}, options);

sections.forEach(section => {
  observer.observe(section);
});
