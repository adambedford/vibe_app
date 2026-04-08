import * as Amplitude from '@amplitude/analytics-react-native';

const AMPLITUDE_API_KEY = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY || '';

export function initAnalytics() {
  if (!AMPLITUDE_API_KEY) return;
  Amplitude.init(AMPLITUDE_API_KEY);
}

export function identify(userId: string, properties: Record<string, any>) {
  const identifyObj = new Amplitude.Identify();
  Object.entries(properties).forEach(([key, value]) => {
    identifyObj.set(key, value);
  });
  Amplitude.identify(identifyObj);
  Amplitude.setUserId(userId);
}

export function resetUser() {
  Amplitude.reset();
}

export function track(event: string, properties?: Record<string, any>) {
  Amplitude.track(event, properties);
}

// Auth & Onboarding
export const trackAppOpened = (source: 'organic' | 'deeplink' | 'notification') =>
  track('app_opened', { source });
export const trackSignupWallShown = (trigger: string) =>
  track('signup_wall_shown', { trigger });
export const trackSignupCompleted = (method: 'email' | 'apple' | 'google') =>
  track('signup_completed', { method });
export const trackSignupDismissed = (trigger: string) =>
  track('signup_dismissed', { trigger });
export const trackProfileSetupCompleted = () =>
  track('profile_setup_completed');
export const trackWalkthroughStarted = () =>
  track('walkthrough_started');
export const trackWalkthroughStepCompleted = (step: number, selection: string) =>
  track('walkthrough_step_completed', { step, selection });
export const trackWalkthroughSkipped = (atStep: number) =>
  track('walkthrough_skipped', { at_step: atStep });
export const trackWalkthroughCompleted = (selections: object) =>
  track('walkthrough_completed', { selections });

// Feed & Discovery
export const trackFeedViewed = (tab: 'home' | 'explore' | 'following') =>
  track('feed_viewed', { tab });
export const trackFeedCardImpressed = (appId: number, position: number, tab: string) =>
  track('feed_card_impressed', { app_id: appId, position, tab });
export const trackFeedScrolled = (maxDepth: number, cardsImpressed: number, durationSeconds: number, tab: string) =>
  track('feed_scrolled', { max_depth: maxDepth, cards_impressed: cardsImpressed, duration_seconds: durationSeconds, tab });
export const trackFeedCardTapped = (appId: number, position: number, source: string) =>
  track('feed_card_tapped', { app_id: appId, position, source });

// App Playing
export const trackAppPlayed = (appId: number, creatorId: number, isMultiplayer: boolean, source: string) =>
  track('app_played', { app_id: appId, creator_id: creatorId, is_multiplayer: isMultiplayer, source });
export const trackAppPlayDuration = (appId: number, durationSeconds: number, completed: boolean, bounced: boolean) =>
  track('app_play_duration', { app_id: appId, duration_seconds: durationSeconds, completed, bounced });
export const trackAppLiked = (appId: number) =>
  track('app_liked', { app_id: appId });
export const trackAppCommented = (appId: number, commentLength: number) =>
  track('app_commented', { app_id: appId, comment_length: commentLength });
export const trackAppShared = (appId: number, method: 'link' | 'native_share') =>
  track('app_shared', { app_id: appId, method });
export const trackAppSaved = (appId: number) =>
  track('app_saved', { app_id: appId });
export const trackAppReported = (appId: number, reason: string) =>
  track('app_reported', { app_id: appId, reason });

// Creation
export const trackCreationStarted = (source: 'walkthrough' | 'create_tab' | 'remix', sourceAppId?: number) =>
  track('creation_started', { source, source_app_id: sourceAppId });
export const trackCreationPromptSent = (sessionId: number, promptLength: number, isFirst: boolean) =>
  track('creation_prompt_sent', { session_id: sessionId, prompt_length: promptLength, is_first: isFirst });
export const trackCreationPlanShown = (sessionId: number) =>
  track('creation_plan_shown', { session_id: sessionId });
export const trackCreationPlanApproved = (sessionId: number) =>
  track('creation_plan_approved', { session_id: sessionId });

// Remix
export const trackRemixStarted = (sourceAppId: number, sourceCreatorId: number) =>
  track('remix_started', { source_app_id: sourceAppId, source_creator_id: sourceCreatorId });

// Multiplayer
export const trackLobbyCreated = (appId: number, maxPlayers: number) =>
  track('lobby_created', { app_id: appId, max_players: maxPlayers });

// Social
export const trackUserFollowed = (followedUserId: number) =>
  track('user_followed', { followed_user_id: followedUserId });
export const trackUserUnfollowed = (unfollowedUserId: number) =>
  track('user_unfollowed', { unfollowed_user_id: unfollowedUserId });
export const trackProfileViewed = (viewedUserId: number, source: string) =>
  track('profile_viewed', { viewed_user_id: viewedUserId, source });
export const trackNotificationTapped = (type: string, ageSeconds: number) =>
  track('notification_tapped', { type, age_seconds: ageSeconds });
