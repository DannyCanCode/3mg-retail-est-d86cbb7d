// Debug script to understand profit margin slider issue
console.log("=== PROFIT MARGIN SLIDER DEBUG ===");

// Check if the slider component exists
const slider = document.querySelector('[id="profit-margin"]');
if (slider) {
  console.log("✅ Slider found:", slider);
  console.log("Current value:", slider.value);
  console.log("Min:", slider.min);
  console.log("Max:", slider.max);
  console.log("Step:", slider.step);
  
  // Check for event listeners
  const events = ['input', 'change', 'mousedown', 'mouseup', 'touchstart', 'touchend'];
  events.forEach(event => {
    // This won't show React's synthetic events, but will show if native events work
    slider.addEventListener(event, (e) => {
      console.log(`[${event}] Value: ${e.target.value}`);
    }, { once: true });
  });
  
  console.log("Try moving the slider now...");
} else {
  console.log("❌ Slider not found! Looking for other elements...");
  
  // Check for Radix UI slider
  const radixSlider = document.querySelector('[data-orientation="horizontal"]');
  if (radixSlider) {
    console.log("✅ Found Radix UI slider:", radixSlider);
    console.log("Aria values:", {
      'aria-valuemin': radixSlider.getAttribute('aria-valuemin'),
      'aria-valuemax': radixSlider.getAttribute('aria-valuemax'),
      'aria-valuenow': radixSlider.getAttribute('aria-valuenow'),
    });
  }
}

// Check for React errors
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.log("React DevTools detected");
}

// Check console errors
console.log("\n=== CHECKING FOR ERRORS ===");
const originalError = console.error;
let errorCount = 0;
console.error = function(...args) {
  errorCount++;
  console.log(`[ERROR ${errorCount}]`, ...args);
  originalError.apply(console, args);
};

console.log("Debug script loaded. Check console for slider events."); 