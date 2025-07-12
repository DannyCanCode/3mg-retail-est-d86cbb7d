import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('UI Issues Test', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication by setting localStorage
    await page.goto('http://localhost:5173');
    
    // Set up mock auth state
    await page.evaluate(() => {
      // Mock user session
      localStorage.setItem('sb-xtdyirvhfyxmpexvjjcb-auth-token', JSON.stringify({
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh',
        user: {
          id: 'test-user-id',
          email: 'test@3mgroofing.com',
          role: 'admin'
        }
      }));
    });
    
    // Navigate to estimates
    await page.goto('http://localhost:5173/estimates');
  });

  test('profit margin slider should allow dragging to any value', async ({ page }) => {
    // Upload a test PDF first
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(join(__dirname, 'fixtures/sample-eagleview.pdf'));
    
    // Wait for processing
    await page.waitForSelector('text=Measurements extracted successfully', { timeout: 10000 });
    
    // Continue to materials
    await page.click('button:has-text("Continue")');
    
    // Wait for materials tab
    await page.waitForSelector('text=Materials Selection');
    
    // Select a GAF package to enable materials
    await page.click('text=GAF 1 - Silver Pledge');
    
    // Continue to pricing
    await page.click('button:has-text("Continue to Pricing")');
    
    // Wait for pricing tab
    await page.waitForSelector('text=Labor Rates & Profit Margin');
    
    // Find the profit margin slider
    const slider = await page.locator('[id="profit-margin"]');
    
    // Get initial value
    const initialValue = await page.locator('.text-2xl.font-bold.text-green-600').textContent();
    console.log('Initial profit margin:', initialValue);
    
    // Drag slider to different positions
    const sliderBox = await slider.boundingBox();
    if (sliderBox) {
      // Drag to 35%
      await page.mouse.move(sliderBox.x + sliderBox.width * 0.5, sliderBox.y + sliderBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(sliderBox.x + sliderBox.width * 0.7, sliderBox.y + sliderBox.height / 2);
      await page.mouse.up();
      
      // Check value changed
      const newValue = await page.locator('.text-2xl.font-bold.text-green-600').textContent();
      console.log('New profit margin:', newValue);
      
      expect(newValue).not.toBe(initialValue);
      expect(parseInt(newValue?.replace('%', '') || '0')).toBeGreaterThan(30);
    }
  });

  test('dumpster count input should not glitch', async ({ page }) => {
    // Navigate through to pricing tab (same as above)
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(join(__dirname, 'fixtures/sample-eagleview.pdf'));
    await page.waitForSelector('text=Measurements extracted successfully', { timeout: 10000 });
    await page.click('button:has-text("Continue")');
    await page.waitForSelector('text=Materials Selection');
    await page.click('text=GAF 1 - Silver Pledge');
    await page.click('button:has-text("Continue to Pricing")');
    await page.waitForSelector('text=Labor Rates & Profit Margin');
    
    // Find dumpster count input
    const dumpsterInput = await page.locator('#labor-dumpsterCount');
    
    // Get initial value
    const initialValue = await dumpsterInput.inputValue();
    console.log('Initial dumpster count:', initialValue);
    
    // Click up arrow multiple times
    await dumpsterInput.focus();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    
    // Check value increased smoothly
    const newValue = await dumpsterInput.inputValue();
    console.log('New dumpster count:', newValue);
    
    expect(parseInt(newValue)).toBe(parseInt(initialValue) + 3);
    
    // Test clearing and blur
    await dumpsterInput.fill('');
    await page.keyboard.press('Tab'); // Blur
    
    // Should default to 1
    const blurredValue = await dumpsterInput.inputValue();
    expect(blurredValue).toBe('1');
  });

  test('no UI flash between upload and review', async ({ page }) => {
    // Monitor for flash by checking if old UI appears
    let oldUIDetected = false;
    
    page.on('framenavigated', async () => {
      try {
        const hasOldUI = await page.locator('text=Roof Area').isVisible();
        if (hasOldUI) {
          oldUIDetected = true;
        }
      } catch (e) {
        // Ignore errors during navigation
      }
    });
    
    // Upload PDF
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(join(__dirname, 'fixtures/sample-eagleview.pdf'));
    
    // Wait for transition
    await page.waitForSelector('text=Review Measurements', { timeout: 10000 });
    
    // Check that old UI never appeared
    expect(oldUIDetected).toBe(false);
    
    // Verify we're on the new simplified review tab
    expect(await page.locator('text=Review Measurements').isVisible()).toBe(true);
    expect(await page.locator('text=Roof Area').isVisible()).toBe(false);
  });

  test('material cards should maintain order when navigating', async ({ page }) => {
    // Upload PDF and get to materials
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(join(__dirname, 'fixtures/sample-eagleview.pdf'));
    await page.waitForSelector('text=Measurements extracted successfully', { timeout: 10000 });
    await page.click('button:has-text("Continue")');
    await page.waitForSelector('text=Materials Selection');
    
    // Select GAF package
    await page.click('text=GAF 1 - Silver Pledge');
    
    // Wait for materials to load
    await page.waitForTimeout(1000);
    
    // Get initial order of material cards
    const initialOrder = await page.locator('.space-y-3 > div').allTextContents();
    console.log('Initial material order:', initialOrder);
    
    // Navigate to pricing and back
    await page.click('button:has-text("Continue to Pricing")');
    await page.waitForSelector('text=Labor Rates & Profit Margin');
    await page.click('button:has-text("Back to Materials")');
    await page.waitForSelector('text=Materials Selection');
    
    // Get order after navigation
    const newOrder = await page.locator('.space-y-3 > div').allTextContents();
    console.log('Material order after navigation:', newOrder);
    
    // Verify order is maintained
    expect(newOrder).toEqual(initialOrder);
    
    // Verify low-slope materials are at top if present
    const firstCard = newOrder[0];
    if (firstCard.includes('ISO') || firstCard.includes('Base') || firstCard.includes('Cap')) {
      console.log('Low-slope materials correctly positioned at top');
    }
  });
}); 