/**
 * Twitter API request model types.
 * Ported from f2/apps/twitter/model.py
 */

/**
 * Features JSON that must be sent with each GraphQL request.
 * These values are hardcoded as Twitter requires them.
 */
export const DEFAULT_FEATURES = JSON.stringify({
  articles_preview_enabled: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  communities_web_enable_tweet_community_results_fetch: true,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  freedom_of_speech_not_reach_fetch_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  longform_notetweets_consumption_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  responsive_web_enhance_cards_enabled: false,
  responsive_web_graphql_exclude_directive_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  rweb_tipjar_consumption_enabled: true,
  rweb_video_timestamps_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_awards_web_tipping_enabled: false,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  tweet_with_visibility_results_prefer_gql_media_interstitial_enabled: true,
  tweetypie_unmention_optimization_enabled: true,
  verified_phone_label_enabled: false,
  view_counts_everywhere_api_enabled: true,
});

/**
 * Field toggles JSON for each request.
 */
export const DEFAULT_FIELD_TOGGLES = JSON.stringify({
  withArticlePlainText: false,
  withArticleRichContentState: true,
  withDisallowedReplyControls: false,
  withGrokAnalyze: false,
});

/**
 * Parameters for fetching tweet detail.
 */
export interface TweetDetailParams {
  focalTweetId: string;
  with_rux_injections?: boolean;
  includePromotedContent?: boolean;
  withCommunity?: boolean;
  withQuickPromoteEligibilityTweetFields?: boolean;
  withBirdwatchNotes?: boolean;
  withVoice?: boolean;
  rankingMode?: string;
  referrer?: string;
  controller_data?: string;
}

/**
 * Parameters for fetching user profile.
 */
export interface UserProfileParams {
  screen_name: string;
}

/**
 * Parameters for fetching user's tweets.
 */
export interface UserTweetsParams {
  userId: string;
  count: number;
  cursor?: string;
  includePromotedContent?: boolean;
  withQuickPromoteEligibilityTweetFields?: boolean;
  withVoice?: boolean;
  withV2Timeline?: boolean;
}

/**
 * Build query string from an object.
 */
export function buildQueryString(params: Record<string, unknown> | object): string {
  const record = params as Record<string, unknown>;
  return Object.entries(record)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(typeof v === 'object' ? JSON.stringify(v) : String(v))}`)
    .join('&');
}
