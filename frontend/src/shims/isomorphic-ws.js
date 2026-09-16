// Shim for isomorphic-ws in browser environments.
// The Midnight SDK indexer does `import { WebSocket } from 'isomorphic-ws'`
// but the browser.js file only has `export default ws`.
// This shim provides both the default and named export.

const ws = typeof WebSocket !== 'undefined' ? WebSocket : null;

export default ws;
export { ws as WebSocket };
