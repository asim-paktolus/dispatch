/* eslint-disable no-var */
/**
 * Universal SCORM API adapter:
 * - SCORM 1.2: window.API (LMSInitialize/LMSGetValue/...)
 * - SCORM 2004: window.API_1484_11 (Initialize/GetValue/...)
 *
 * Exposes: window.ScormUniversal = { version, getApi(), ensureInitialized(), call(unifiedMethod,args) }
 *
 * Unified methods:
 * - Initialize("") / GetValue(el) / SetValue(el,val) / Commit("") / Terminate("")
 * - GetLastError() / GetErrorString(code) / GetDiagnostic(code)
 */
(function () {
  function findApi2004(win) {
    var maxTries = 500;
    var cur = win;
    while (cur && maxTries-- > 0) {
      try {
        if (cur.API_1484_11 && typeof cur.API_1484_11.Initialize === "function") return cur.API_1484_11;
      } catch (e) {}
      try {
        if (cur.parent && cur.parent !== cur) cur = cur.parent;
        else break;
      } catch (e2) { break; }
    }
    return null;
  }

  function findApi12(win) {
    var maxTries = 500;
    var cur = win;
    while (cur && maxTries-- > 0) {
      try {
        if (cur.API && typeof cur.API.LMSInitialize === "function") return cur.API;
      } catch (e) {}
      try {
        if (cur.parent && cur.parent !== cur) cur = cur.parent;
        else break;
      } catch (e2) { break; }
    }
    return null;
  }

  function resolveApi() {
    var api2004 = findApi2004(window) || (window.opener ? findApi2004(window.opener) : null);
    if (api2004) return { version: "2004", api: api2004 };

    var api12 = findApi12(window) || (window.opener ? findApi12(window.opener) : null);
    if (api12) return { version: "1.2", api: api12 };

    return { version: null, api: null };
  }

  function mapMethod(version, unifiedMethod) {
    if (version === "2004") return unifiedMethod;
    switch (unifiedMethod) {
      case "Initialize": return "LMSInitialize";
      case "GetValue": return "LMSGetValue";
      case "SetValue": return "LMSSetValue";
      case "Commit": return "LMSCommit";
      case "Terminate": return "LMSFinish";
      case "GetLastError": return "LMSGetLastError";
      case "GetErrorString": return "LMSGetErrorString";
      case "GetDiagnostic": return "LMSGetDiagnostic";
      default: return unifiedMethod;
    }
  }

  function safeGetLastError(version, api) {
    try {
      return version === "2004" ? String(api.GetLastError()) : String(api.LMSGetLastError());
    } catch (e) {
      return "0";
    }
  }

  function safeGetErrorString(version, api, code) {
    try {
      return version === "2004" ? String(api.GetErrorString(code)) : String(api.LMSGetErrorString(code));
    } catch (e) {
      return "";
    }
  }

  function safeGetDiagnostic(version, api, code) {
    try {
      return version === "2004" ? String(api.GetDiagnostic(code)) : String(api.LMSGetDiagnostic(code));
    } catch (e) {
      return "";
    }
  }

  function callResolved(version, api, unifiedMethod, args) {
    try {
      var actual = mapMethod(version, unifiedMethod);
      var fn = api && api[actual];
      if (typeof fn !== "function") {
        return { ok: false, result: null, errorCode: "101", errorString: "SCORM method not found: " + actual, diagnostic: "" };
      }
      var result = fn.apply(api, args || []);
      var code = safeGetLastError(version, api);
      var ok = code === "0";
      return {
        ok: ok,
        result: result,
        errorCode: code,
        errorString: ok ? "" : safeGetErrorString(version, api, code),
        diagnostic: ok ? "" : safeGetDiagnostic(version, api, code),
      };
    } catch (e) {
      return { ok: false, result: null, errorCode: "101", errorString: String(e && e.message ? e.message : e), diagnostic: "" };
    }
  }

  function ensureInitializedResolved(version, api) {
    return callResolved(version, api, "Initialize", [""]).ok;
  }

  var initial = resolveApi();
  window.ScormUniversal = {
    version: initial.version,
    getApi: function () { return resolveApi(); },
    ensureInitialized: function () {
      var r = resolveApi();
      window.ScormUniversal.version = r.version;
      return r.api ? ensureInitializedResolved(r.version, r.api) : false;
    },
    call: function (unifiedMethod, args) {
      var r = resolveApi();
      window.ScormUniversal.version = r.version;
      if (!r.api) {
        return { ok: false, result: null, errorCode: "101", errorString: "SCORM API not found", diagnostic: "" };
      }
      return callResolved(r.version, r.api, unifiedMethod, args);
    },
  };
})();
