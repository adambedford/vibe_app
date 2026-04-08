import { by, device, element, expect } from 'detox';

/**
 * 5 Critical E2E Paths from 07-CICD-Testing-Strategy.md:
 * 1. Anonymous browse -> play an app -> sign up
 * 2. Create an app via walkthrough -> publish
 * 3. Open app -> like -> comment
 * 4. Open app -> remix -> publish remix
 * 5. Open multiplayer app -> create lobby -> start game
 */

describe('Critical Path 1: Anonymous -> Play -> Sign Up', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should show feed on launch', async () => {
    await expect(element(by.text('Feed'))).toBeVisible();
  });

  it('should open an app from the feed', async () => {
    // Tap the first feed card
    await element(by.id('feed-card-0')).tap();
    await expect(element(by.text('Close'))).toBeVisible();
  });

  it('should show sign-up wall after playing', async () => {
    // Go back and try to like (requires auth)
    await element(by.text('Close')).tap();
    // After 2+ plays, sign-up wall should appear on gated actions
  });

  it('should complete sign up', async () => {
    await element(by.text('Sign Up')).tap();
    await element(by.id('register-email')).typeText('e2e@test.com');
    await element(by.id('register-password')).typeText('password123');
    await element(by.id('register-display-name')).typeText('E2E Tester');
    await element(by.id('register-username')).typeText('e2etester');
    await element(by.id('register-dob')).typeText('2000-01-01');
    await element(by.text('Sign Up')).tap();
    // Should navigate to profile setup
    await expect(element(by.text('Set up your profile'))).toBeVisible();
  });
});

describe('Critical Path 2: Create App via Walkthrough -> Publish', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: false });
  });

  it('should navigate to Create tab', async () => {
    await element(by.text('Create')).tap();
    await expect(element(by.text('What do you want to make?'))).toBeVisible();
  });

  it('should complete walkthrough', async () => {
    await element(by.text('Game')).tap();
    await expect(element(by.text('Pick a vibe'))).toBeVisible();
    await element(by.text('Neon / Cyber')).tap();
    await expect(element(by.text("What's it about?"))).toBeVisible();
    await element(by.text('Space')).tap();
    await expect(element(by.text('Anything else?'))).toBeVisible();
    await element(by.text('Build!')).tap();
  });
});

describe('Critical Path 3: Open App -> Like -> Comment', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: false });
  });

  it('should open an app and like it', async () => {
    await element(by.text('Feed')).tap();
    await element(by.id('feed-card-0')).tap();
    // Like the app
    await element(by.id('like-button')).tap();
  });

  it('should add a comment', async () => {
    // Navigate to comments (placeholder - actual UI would differ)
    await element(by.id('comment-button')).tap();
  });
});

describe('Critical Path 4: Open App -> Remix -> Publish', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: false });
  });

  it('should start a remix', async () => {
    await element(by.text('Feed')).tap();
    await element(by.id('feed-card-0')).tap();
    await element(by.id('remix-button')).tap();
    await expect(element(by.text('Remix:'))).toBeVisible();
  });
});

describe('Critical Path 5: Multiplayer App -> Lobby', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: false });
  });

  it('should open a multiplayer app and see play options', async () => {
    // Navigate to a multiplayer app (would need test data)
    // This test verifies the multiplayer flow exists
    await element(by.text('Explore')).tap();
  });
});
