/* eslint-disable no-var */
/**
 * Customer-facing configuration.
 *
 * Goal: keep the ZIP unchanged across customers/platforms.
 *
 * Recommended approach:
 * - Always launch your own server endpoint (same origin you control)
 * - Pass a per-course/per-customer value via the LMS "launch data" (cmi.launch_data)
 *   Examples:
 *     - token string:   "abc123"
 *     - query string:   "token=abc123&course_id=27"
 *     - full URL:       "https://higherl-lms-api.test/scorm/dispatch/launch?token=abc123"
 */

// Your dispatcher/server base URL (must be https in production).
// Trailing slash is OK.
var DISPATCH_SERVER_URL = "https://higherl-lms-api.test/";

// Default launch endpoint on your server.
// If the LMS provides launch data, the wrapper will append it here.
var DISPATCH_SERVER_LAUNCH_PATH = "scorm/dispatch/launch";

// Optional: fallback parameters (used if the LMS doesn't provide cmi.launch_data).
// Keep these empty for a fully "no per-customer config" package and rely on LMS Launch data.
//
// For your current test course, this is prefilled so the package works even when Launch data is not configured.
var DISPATCH_FALLBACK_COURSE_URL =
  "https://lmsassets.cdn.higherl.com/27/1/assets/scorm-assets/vendor_management_and_third_party_risk_management_final_rv1.1/index_lms.html";

// Alternative fallback: a single token your server can resolve to a course/user attempt.
var DISPATCH_FALLBACK_TOKEN = "";

// Optional hard-coded fallback launch URL (used only if no launch_data/fallbacks are present).
// Leave empty to use DISPATCH_SERVER_URL + DISPATCH_SERVER_LAUNCH_PATH.
var DISPATCH_LAUNCH_URL = "";

// Allowed origins for postMessage RPC from the hosted page loaded in iframe/popup.
// If empty, the wrapper will allow only the computed launch origin.
var DISPATCH_ALLOWED_ORIGINS = [];

// "iframe" (default) or "popup"
var DISPATCH_MODE = "iframe";

// Auto-commit interval; set 0 to disable.
var DISPATCH_AUTO_COMMIT_SECONDS = 30;
