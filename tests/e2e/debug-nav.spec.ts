import { test, expect, chromium } from '@playwright/test';
import { launchExtension, getExtensionId, openOptions } from './fixtures';

test('debug navigation', async () => {
    console.log('1. Launching extension...');
    const context = await launchExtension(chromium);
    console.log('2. Getting extension id...');
    const extensionId = await getExtensionId(context);
    console.log(`Extension ID: ${extensionId}`);

    console.log('3. Opening options...');
    const page = await openOptions(context, extensionId);
    
    console.log('4. Waiting for marker...');
    const marker = page.locator('[data-testid="options-state-marker"]');
    await expect(marker).toBeAttached({ timeout: 15000 });
    
    const branch = await marker.getAttribute('data-branch');
    console.log(`Initial branch: ${branch}`);
    
    await context.close();
    console.log('Done.');
});
