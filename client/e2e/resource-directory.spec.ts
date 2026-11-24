import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test('Find study rooms in the directory', async ({ page }: { page: Page }): Promise<void> => {
  const directory = page.getByRole('region', { name: 'Explore resources' });
  const studyRoom = directory.getByRole('heading', { name: 'Library Study Room' });
  const cameraKit = directory.getByRole('heading', { name: 'Media Camera Kit' });

  await test.step('Given both resources are listed in CampusHub', async (): Promise<void> => {
    await page.goto('/');
    await expect(studyRoom).toBeVisible();
    await expect(cameraKit).toBeVisible();
  });

  await test.step('When I select Study rooms', async (): Promise<void> => {
    await directory.getByRole('button', { name: 'Study rooms' }).click();
  });

  await test.step('Then I see the study room and the camera kit is hidden', async (): Promise<void> => {
    await expect(studyRoom).toBeVisible();
    await expect(cameraKit).toBeHidden();
  });
});
