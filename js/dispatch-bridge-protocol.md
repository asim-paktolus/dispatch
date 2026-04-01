# Dispatch Bridge Protocol (Universal)

Your hosted player/content should send `postMessage` to the wrapper window.

The wrapper only accepts messages when `event.origin` is in `DISPATCH_ALLOWED_ORIGINS`.

## Request (recommended)

```js
parent.postMessage({
  type: "scorm_rpc",
  id: "unique-request-id",
  method: "SetValue",
  args: ["cmi.completion_status", "completed"]
}, "*");
```

## Response

```js
{
  type: "scorm_rpc_result",
  id: "unique-request-id",
  ok: true,
  result: "true",
  errorCode: "0",
  errorString: "",
  diagnostic: "",
  version: "2004" // or "1.2"
}
```

## Unified methods

- `Initialize("")`
- `GetValue(element)`
- `SetValue(element, value)`
- `Commit("")`
- `Terminate("")`
- `GetLastError()`
- `GetErrorString(code)`
- `GetDiagnostic(code)`
