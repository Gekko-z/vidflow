/**
 * Twitter Crawler - makes GraphQL API requests to Twitter.
 * Ported from f2/apps/twitter/crawler.py
 */

import { HttpClient } from '../../crawler/index.js';
import type { TwitterCredentials } from '../../types/index.js';
import { TwitterAPIEndpoints } from './api.js';
import {
  DEFAULT_FEATURES,
  DEFAULT_FIELD_TOGGLES,
  type TweetDetailParams,
  type UserProfileParams,
  type UserTweetsParams,
  buildQueryString,
} from './types.js';

const BASE_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Referer': 'https://x.com/',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
};

export class TwitterCrawler {
  private http: HttpClient;
  private credentials: TwitterCredentials;

  constructor(credentials: TwitterCredentials) {
    this.credentials = credentials;
    this.http = new HttpClient({ maxRetries: 3, timeout: 15000 });
  }

  private getHeaders(): Record<string, string> {
    return {
      ...BASE_HEADERS,
      Cookie: this.credentials.cookie,
      Authorization: this.credentials.authorization,
      'X-Csrf-Token': this.credentials.xCsrfToken,
    };
  }

  private buildGraphqlUrl(
    endpointPath: string,
    queryVariables: Record<string, unknown>,
    extraParams?: Record<string, unknown>,
  ): string {
    const baseUrl = `${TwitterAPIEndpoints.API_DOMAIN}${endpointPath}`;
    const params: Record<string, unknown> = {
      variables: JSON.stringify(queryVariables),
      features: DEFAULT_FEATURES,
      fieldToggles: DEFAULT_FIELD_TOGGLES,
      ...extraParams,
    };
    const qs = buildQueryString(params);
    return `${baseUrl}?${qs}`;
  }

  /**
   * Fetch tweet detail by tweet ID.
   */
  async fetchTweetDetail(tweetId: string): Promise<unknown> {
    const params: TweetDetailParams = {
      focalTweetId: tweetId,
      with_rux_injections: true,
      includePromotedContent: true,
      withCommunity: true,
      withQuickPromoteEligibilityTweetFields: true,
      withBirdwatchNotes: true,
      withVoice: true,
      rankingMode: 'Relevance',
      referrer: 'tweet',
      controller_data: 'DAACDAABDAABCgABAAAAAAAAAAAKAAgMseIsK1XAAAAAAAA=',
    };
    const url = this.buildGraphqlUrl(TwitterAPIEndpoints.POST_DETAIL, params as unknown as Record<string, unknown>);
    const response = await this.http.get(url, { headers: this.getHeaders() });
    return response.data;
  }

  /**
   * Fetch user profile by screen name.
   */
  async fetchUserProfile(screenName: string): Promise<unknown> {
    const params: UserProfileParams = { screen_name: screenName };
    const extraParams = {
      features: JSON.stringify({
        creator_subscriptions_tweet_preview_api_enabled: true,
        hidden_profile_subscriptions_enabled: true,
        highlights_tweets_tab_ui_enabled: true,
        responsive_web_graphql_exclude_directive_enabled: true,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        responsive_web_graphql_timeline_navigation_enabled: true,
        responsive_web_twitter_article_notes_tab_enabled: true,
        rweb_tipjar_consumption_enabled: true,
        subscriptions_feature_can_gift_premium: true,
        subscriptions_verification_info_is_identity_verified_enabled: true,
        subscriptions_verification_info_verified_since_enabled: true,
        verified_phone_label_enabled: false,
      }),
      fieldToggles: JSON.stringify({ withAuxiliaryUserLabels: false }),
    };
    const url = this.buildGraphqlUrl(TwitterAPIEndpoints.USER_PROFILE, params as unknown as Record<string, unknown>, extraParams);
    const response = await this.http.get(url, { headers: this.getHeaders() });
    return response.data;
  }

  /**
   * Fetch user's tweets.
   */
  async fetchUserTweets(params: UserTweetsParams): Promise<unknown> {
    const url = this.buildGraphqlUrl(TwitterAPIEndpoints.USER_POST, params as unknown as Record<string, unknown>);
    const response = await this.http.get(url, { headers: this.getHeaders() });
    return response.data;
  }

  /**
   * Fetch user's liked tweets.
   */
  async fetchUserLikes(
    userId: string,
    count = 20,
    cursor = '',
  ): Promise<unknown> {
    const params = {
      userId,
      count,
      cursor,
      includePromotedContent: true,
      withBirdwatchNotes: false,
      withClientEventToken: false,
      withVoice: true,
      withV2Timeline: true,
    };
    const url = this.buildGraphqlUrl(TwitterAPIEndpoints.USER_LIKE, params as unknown as Record<string, unknown>);
    const response = await this.http.get(url, { headers: this.getHeaders() });
    return response.data;
  }

  /**
   * Fetch user's bookmarked tweets.
   */
  async fetchBookmarks(count = 20, cursor = ''): Promise<unknown> {
    const extraParams = {
      features: JSON.stringify({
        graphql_timeline_v2_bookmark_timeline: true,
        rweb_tipjar_consumption_enabled: true,
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        creator_subscriptions_tweet_preview_api_enabled: true,
        responsive_web_graphql_timeline_navigation_enabled: true,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        communities_web_enable_tweet_community_results_fetch: true,
        c9s_tweet_anatomy_moderator_badge_enabled: true,
        articles_preview_enabled: true,
        responsive_web_edit_tweet_api_enabled: true,
        graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
        view_counts_everywhere_api_enabled: true,
        longform_notetweets_consumption_enabled: true,
        responsive_web_twitter_article_tweet_consumption_enabled: true,
        tweet_awards_web_tipping_enabled: false,
        creator_subscriptions_quote_tweet_preview_enabled: false,
        freedom_of_speech_not_reach_fetch_enabled: true,
        standardized_nudges_misinfo: true,
        tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
        rweb_video_timestamps_enabled: true,
        longform_notetweets_rich_text_read_enabled: true,
        longform_notetweets_inline_media_enabled: true,
        responsive_web_enhance_cards_enabled: false,
      }),
    };
    const params = { count, cursor, includePromotedContent: true };
    const url = this.buildGraphqlUrl(
      TwitterAPIEndpoints.USER_BOOKMARK,
      params,
      extraParams,
    );
    const response = await this.http.get(url, { headers: this.getHeaders() });
    return response.data;
  }
}
