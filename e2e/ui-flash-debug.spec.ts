import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('UI Flash Debug - PDF Upload Workflow', () => {
  let consoleMessages: string[] = [];
  let tabChanges: string[] = [];
  
  test.beforeEach(async ({ page }) => {
    // Reset arrays for each test
    consoleMessages = [];
    tabChanges = [];
    
    // Capture all console messages
    page.on('console', msg => {
      const message = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(message);
      
      // Track tab changes specifically
      if (msg.text().includes('Tab changing') || msg.text().includes('Tab changed')) {
        tabChanges.push(`${Date.now()}: ${msg.text()}`);
        console.log(`🔄 TAB CHANGE: ${msg.text()}`);
      }
      
      // Track other important events
      if (msg.text().includes('PDF data extracted') || 
          msg.text().includes('measurements review') ||
          msg.text().includes('handleMaterialsUpdate') ||
          msg.text().includes('START FRESH')) {
        console.log(`📝 KEY EVENT: ${msg.text()}`);
      }
    });
    
    // Navigate to estimates page
    await page.goto('http://localhost:5173/estimates');
    
    // Wait for page to fully load
    await page.waitForSelector('[data-testid="estimate-type-selector"], .text-lg', { timeout: 10000 });
  });

  test('Debug UI flash during PDF upload workflow with detailed logging', async ({ page }) => {
    console.log('🎬 Starting UI Flash Debug Test');
    
    // Step 1: Select estimate type
    console.log('📋 Step 1: Selecting estimate type');
    await page.screenshot({ path: 'debug-screenshots/01-initial-load.png', fullPage: true });
    
    const roofOnlyOption = page.locator('text=Roof Shingles Only');
    await roofOnlyOption.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'debug-screenshots/02-estimate-type-selected.png', fullPage: true });
    
    // Step 2: Navigate to upload tab
    console.log('📁 Step 2: Navigating to upload tab');
    const uploadTab = page.locator('text=Upload EagleView');
    await uploadTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'debug-screenshots/03-upload-tab-ready.png', fullPage: true });
    
    // Step 3: Upload PDF file
    console.log('📄 Step 3: Uploading PDF file');
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'sample-eagleview.pdf');
    
    // Set up a promise to wait for PDF processing completion
    const pdfProcessedPromise = page.waitForFunction(() => {
      return window.console.log.toString().includes('PDF data extracted') ||
             document.querySelector('[data-testid="pdf-success"]') !== null ||
             document.querySelector('text=successfully') !== null;
    }, { timeout: 30000 });
    
    await fileInput.setInputFiles(filePath);
    console.log('📤 PDF file uploaded, waiting for processing...');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'debug-screenshots/04-pdf-processing.png', fullPage: true });
    
    // Step 4: Wait for PDF processing and capture the transition
    console.log('⏳ Step 4: Waiting for PDF processing completion');
    try {
      await pdfProcessedPromise;
      console.log('✅ PDF processing detected as complete');
    } catch (error) {
      console.log('⚠️ PDF processing timeout, continuing...');
    }
    
    // Capture rapid screenshots during the critical transition period
    console.log('📸 Step 5: Capturing rapid transition screenshots');
    for (let i = 0; i < 10; i++) {
      await page.screenshot({ 
        path: `debug-screenshots/05-transition-${i.toString().padStart(2, '0')}.png`, 
        fullPage: true 
      });
      await page.waitForTimeout(200); // 200ms intervals
    }
    
    // Step 6: Check what tab is currently active
    console.log('🎯 Step 6: Checking final active tab');
    await page.waitForTimeout(2000); // Wait for any pending transitions
    
    const activeTab = await page.locator('[data-state="active"]').textContent();
    console.log(`🏷️ Currently active tab: ${activeTab}`);
    
    await page.screenshot({ path: 'debug-screenshots/06-final-state.png', fullPage: true });
    
    // Step 7: Log all captured events
    console.log('📊 Step 7: Analyzing captured events');
    console.log('\n🔄 TAB CHANGES TIMELINE:');
    tabChanges.forEach(change => console.log(`  ${change}`));
    
    console.log('\n📝 KEY CONSOLE MESSAGES:');
    const keyMessages = consoleMessages.filter(msg => 
      msg.includes('PDF data extracted') ||
      msg.includes('Tab changing') ||
      msg.includes('Tab changed') ||
      msg.includes('measurements review') ||
      msg.includes('START FRESH') ||
      msg.includes('handleMaterialsUpdate')
    );
    keyMessages.forEach(msg => console.log(`  ${msg}`));
    
    // Step 8: Try to identify the UI flash pattern
    console.log('\n🔍 Step 8: UI Flash Analysis');
    const uploadToMeasurementsChanges = tabChanges.filter(change => 
      change.includes('upload') && change.includes('measurements')
    );
    const materialsToUploadChanges = tabChanges.filter(change => 
      change.includes('materials') && change.includes('upload')
    );
    
    console.log(`📈 Upload → Measurements changes: ${uploadToMeasurementsChanges.length}`);
    console.log(`📉 Materials → Upload changes: ${materialsToUploadChanges.length}`);
    
    if (materialsToUploadChanges.length > 0) {
      console.log('🚨 ISSUE CONFIRMED: Materials → Upload tab changes detected!');
      console.log('🔍 This indicates the UI flash is still occurring');
    }
    
    // Expect that we don't see excessive tab switching
    expect(materialsToUploadChanges.length).toBeLessThan(2); // Allow max 1 legitimate change
  });

  test('Debug simplified measurement tab loading', async ({ page }) => {
    console.log('🔬 Testing SimplifiedReviewTab loading specifically');
    
    // Quick setup
    await page.locator('text=Roof Shingles Only').click();
    await page.locator('text=Upload EagleView').click();
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'sample-eagleview.pdf');
    await fileInput.setInputFiles(filePath);
    
    // Wait for measurements tab to be accessible
    await page.waitForSelector('[data-testid="tab-trigger-measurements"]', { timeout: 30000 });
    
    // Click measurements tab and capture what loads
    console.log('🎯 Clicking measurements tab');
    await page.locator('[data-testid="tab-trigger-measurements"]').click();
    
    // Rapid screenshots to catch any UI flash
    for (let i = 0; i < 5; i++) {
      await page.screenshot({ 
        path: `debug-screenshots/measurements-load-${i}.png`, 
        fullPage: true 
      });
      await page.waitForTimeout(100);
    }
    
    // Check for SimplifiedReviewTab content
    const simplifiedContent = await page.locator('text=Review Measurements').isVisible();
    const adminAccess = await page.locator('text=Admin Access').isVisible();
    const readOnly = await page.locator('text=Read Only').isVisible();
    
    console.log(`✅ SimplifiedReviewTab loaded: ${simplifiedContent}`);
    console.log(`🛡️ Admin Access visible: ${adminAccess}`);
    console.log(`🔒 Read Only visible: ${readOnly}`);
    
    expect(simplifiedContent).toBe(true);
  });
}); 