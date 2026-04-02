/* eslint-disable no-var */
/**
 * Universal dispatch launcher + bridge.
 *
 * Hosted content can call SCORM via:
 * - type: "scorm_rpc" (recommended, unified)
 * - type: "scorm12_rpc" (legacy)
 * - type: "scorm2004_rpc" (legacy)
 */
(function () {
  var statusDot = document.getElementById("statusDot");
  var statusText = document.getElementById("statusText");
  var errorEl = document.getElementById("error");
  var frame = document.getElementById("contentFrame");

  function setStatus(text, color) {
    statusText.textContent = text;
    statusDot.style.background = color || "#f59e0b";
  }

  function showError(msg) {
    errorEl.style.display = "block";
    errorEl.textContent = msg;
    setStatus("Error", "#ef4444");
  }

  function normalizeBaseUrl(baseUrl) {
    if (!baseUrl) return "";
    return baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
  }

  function getWrapperQuery() {
    try {
      return new URL(window.location.href).searchParams;
    } catch (e) {
      return null;
    }
  }

  function computeLaunchUrl() {
    var base = normalizeBaseUrl(DISPATCH_SERVER_URL);
    var path = (DISPATCH_SERVER_LAUNCH_PATH || "").replace(/^\//, "");

    // 0) If wrapper URL itself has parameters (useful for local testing)
    var qp = getWrapperQuery();
    if (qp) {
      var direct = (qp.get("launch_url") || "").trim();
      if (direct && (direct.indexOf("http://") === 0 || direct.indexOf("https://") === 0)) return direct;

      var qToken = (qp.get("token") || "").trim();
      if (qToken) return base + path + "?token=" + encodeURIComponent(qToken);

      var qCourse = (qp.get("course_url") || "").trim();
      if (qCourse) return base + path + "?course_url=" + encodeURIComponent(qCourse);

      var qLaunchData = (qp.get("launch_data") || "").trim();
      if (qLaunchData) {
        if (qLaunchData.indexOf("http://") === 0 || qLaunchData.indexOf("https://") === 0) return qLaunchData;
        if (qLaunchData.indexOf("=") !== -1 || qLaunchData.indexOf("&") !== -1) {
          return base + path + "?" + qLaunchData.replace(/^\?/, "");
        }
        return base + path + "?token=" + encodeURIComponent(qLaunchData);
      }
    }

    // 1) Try LMS-provided launch data
    var launchData = "";
    try {
      var res = window.ScormUniversal.call("GetValue", ["cmi.launch_data"]);
      if (res && res.ok && res.result != null) launchData = String(res.result || "").trim();
    } catch (e2) {}

    if (launchData) {
      // a) Full URL
      if (launchData.indexOf("http://") === 0 || launchData.indexOf("https://") === 0) {
        return launchData;
      }

      // b) Query string
      if (launchData.indexOf("=") !== -1 || launchData.indexOf("&") !== -1) {
        var qs = launchData.replace(/^\?/, "");
        return base + path + "?" + qs;
      }

      // c) Token string
      return base + path + "?token=" + encodeURIComponent(launchData);
    }

    // 2) Fallback parameters (when LMS doesn't provide launch data)
    if (typeof DISPATCH_FALLBACK_TOKEN === "string" && DISPATCH_FALLBACK_TOKEN.trim()) {
      return base + path + "?token=" + encodeURIComponent(DISPATCH_FALLBACK_TOKEN.trim());
    }

    if (typeof DISPATCH_FALLBACK_COURSE_URL === "string" && DISPATCH_FALLBACK_COURSE_URL.trim()) {
      return base + path + "?course_url=" + encodeURIComponent(DISPATCH_FALLBACK_COURSE_URL.trim());
    }

    // 3) Fallback to static launch URL (if provided)
    if (DISPATCH_LAUNCH_URL && DISPATCH_LAUNCH_URL.indexOf("http") === 0) return DISPATCH_LAUNCH_URL;

    // 4) Final fallback to server path (no parameters)
    return base + path;
  }

  function getAllowedOrigins(computedLaunchUrl) {
    var list = Array.isArray(DISPATCH_ALLOWED_ORIGINS) ? DISPATCH_ALLOWED_ORIGINS : [];
    if (list.length > 0) return list;

    try {
      return [new URL(computedLaunchUrl).origin];
    } catch (e3) {
      return [];
    }
  }

  function isAllowedOrigin(origin, allowedOrigins) {
    if (!origin || origin === "null") return false;
    for (var i = 0; i < allowedOrigins.length; i++) {
      if (origin === allowedOrigins[i]) return true;
    }
    return false;
  }

  function post(targetWindow, origin, payload) {
    try { targetWindow.postMessage(payload, origin); } catch (e4) {}
  }

  function start() {
    setStatus("Connecting to LMS…", "#f59e0b");

    var resolved = window.ScormUniversal.getApi();
    var standalone = !resolved.api;
    var localStore = {};

    function callScorm(method, args) {
      if (!standalone) {
        return window.ScormUniversal.call(method, args);
      }

      var m = String(method || "");
      var a = Array.isArray(args) ? args : [];
      var key;

      if (m === "Initialize" || m === "Commit" || m === "Terminate") {
        return { ok: true, result: "true", errorCode: "0", errorString: "", diagnostic: "", version: "standalone" };
      }
      if (m === "GetLastError") {
        return { ok: true, result: "0", errorCode: "0", errorString: "", diagnostic: "", version: "standalone" };
      }
      if (m === "GetErrorString" || m === "GetDiagnostic") {
        return { ok: true, result: "", errorCode: "0", errorString: "", diagnostic: "", version: "standalone" };
      }
      if (m === "GetValue") {
        key = String(a[0] || "");
        return { ok: true, result: key && Object.prototype.hasOwnProperty.call(localStore, key) ? localStore[key] : "", errorCode: "0", errorString: "", diagnostic: "", version: "standalone" };
      }
      if (m === "SetValue") {
        key = String(a[0] || "");
        localStore[key] = String(a[1] || "");
        return { ok: true, result: "true", errorCode: "0", errorString: "", diagnostic: "", version: "standalone" };
      }

      return { ok: false, result: null, errorCode: "101", errorString: "Unsupported method in standalone: " + m, diagnostic: "", version: "standalone" };
    }

    if (!standalone) {
      var initialized = window.ScormUniversal.ensureInitialized();
      if (!initialized) {
        var err = window.ScormUniversal.call("GetLastError", []).result;
        showError("Failed to initialize SCORM. LMS error: " + err);
        return;
      }
    } else {
      // Some LMSs don't expose SCORM API objects; still launch content and track to your backend.
      setStatus("Standalone mode (no LMS SCORM API)", "#f59e0b");
    }

    var launchUrl = computeLaunchUrl();
    var allowedOrigins = getAllowedOrigins(launchUrl);

    setStatus("Launching content… (" + (standalone ? "standalone" : window.ScormUniversal.version) + ")", "#10b981");

    if (!launchUrl || launchUrl.indexOf("http") !== 0) {
      showError("Launch URL is invalid. Configure DISPATCH_SERVER_URL or pass cmi.launch_data.");
      return;
    }

    var launchOrigin;
    try { launchOrigin = new URL(launchUrl).origin; } catch (e5) { launchOrigin = null; }
    if (!launchOrigin || !isAllowedOrigin(launchOrigin, allowedOrigins)) {
      showError("Launch origin is not allowed: " + (launchOrigin || "(invalid URL)"));
      return;
    }

    var targetWindow = null;
    if ((DISPATCH_MODE || "iframe") === "popup") {
      targetWindow = window.open(launchUrl, "scorm_dispatch_popup");
      if (!targetWindow) {
        showError("Popup blocked by browser. Use iframe mode or allow popups for this LMS domain.");
        return;
      }
      setStatus("Content opened (popup)", "#10b981");
    } else {
      frame.src = launchUrl;
      frame.style.display = "block";
      targetWindow = frame.contentWindow;
      setStatus("Content loading (iframe)…", "#10b981");
    }

    var autoCommitTimer = null;
    var commitSeconds = Number(DISPATCH_AUTO_COMMIT_SECONDS || 0);
    if (!standalone && commitSeconds > 0) {
      autoCommitTimer = setInterval(function () {
        window.ScormUniversal.call("Commit", [""]);
      }, commitSeconds * 1000);
    }

    function handleUnifiedRpc(event, data) {
      var id = data.id;
      var method = data.method;
      var args = data.args || [];
      var res = callScorm(method, args);
      post(event.source || targetWindow, event.origin, {
        type: "scorm_rpc_result",
        id: id,
        ok: res.ok,
        result: res.result,
        errorCode: res.errorCode,
        errorString: res.errorString,
        diagnostic: res.diagnostic,
        version: standalone ? "standalone" : window.ScormUniversal.version,
      });
    }

    function handleLegacyRpc(event, data) {
      var id = data.id;
      var method = data.method;
      var args = data.args || [];

      var unified = method;
      if (method && method.indexOf("LMS") === 0) {
        if (method === "LMSInitialize") unified = "Initialize";
        else if (method === "LMSGetValue") unified = "GetValue";
        else if (method === "LMSSetValue") unified = "SetValue";
        else if (method === "LMSCommit") unified = "Commit";
        else if (method === "LMSFinish") unified = "Terminate";
        else if (method === "LMSGetLastError") unified = "GetLastError";
        else if (method === "LMSGetErrorString") unified = "GetErrorString";
        else if (method === "LMSGetDiagnostic") unified = "GetDiagnostic";
      }

      var res2 = callScorm(unified, args);
      post(event.source || targetWindow, event.origin, {
        type: data.type + "_result",
        id: id,
        ok: res2.ok,
        result: res2.result,
        errorCode: res2.errorCode,
        errorString: res2.errorString,
        diagnostic: res2.diagnostic,
        version: standalone ? "standalone" : window.ScormUniversal.version,
      });
    }

    window.addEventListener("message", function (event) {
      if (!isAllowedOrigin(event.origin, allowedOrigins)) return;
      var data = event.data;
      if (!data || !data.type) return;

      if (data.type === "scorm_rpc") return handleUnifiedRpc(event, data);
      if (data.type === "scorm12_rpc" || data.type === "scorm2004_rpc") return handleLegacyRpc(event, data);
    });

    function shutdown() {
      try { if (autoCommitTimer) clearInterval(autoCommitTimer); } catch (e6) {}
      if (!standalone) {
        try { window.ScormUniversal.call("Commit", [""]); } catch (e7) {}
        try { window.ScormUniversal.call("Terminate", [""]); } catch (e8) {}
      }
    }

    window.addEventListener("beforeunload", shutdown);
    window.addEventListener("unload", shutdown);
  }

  start();
})();
