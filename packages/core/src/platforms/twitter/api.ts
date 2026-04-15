/**
 * Twitter API endpoints.
 * Ported from f2/apps/twitter/api.py
 *
 * Note: GraphQL hash values may change when Twitter updates their API.
 */
export const TwitterAPIEndpoints = {
  TWITTER_DOMAIN: 'https://x.com',
  API_DOMAIN: 'https://x.com/i/api/graphql',

  // GraphQL endpoint paths (hash + operation name)
  USER_PROFILE: '/laYnJPCAcVo0o6pzcnlVxQ/UserByScreenName',
  USER_POST: '/Tg82Ez_kxVaJf7OPbUdbCg/UserTweets',
  USER_LIKE: '/px6_YxfWkXo0odY84iqqmw/Likes',
  USER_BOOKMARK: '/L7vvM2UluPgWOW4GDvWyvw/Bookmarks',
  POST_DETAIL: '/nBS-WpgA6ZG0CyNHD517JQ/TweetDetail',
};
