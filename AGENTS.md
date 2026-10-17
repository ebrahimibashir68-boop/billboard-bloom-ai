# Project rules

- Keep Pi network payload parsing in the browser-safe `src/lib/pi/network.ts` module, separate from server fetches, so protocol rules are shared and directly testable.
- Initialize every Pi SDK instance through `src/lib/pi/sdk.ts` before authentication, including preloaded instances, so concurrent consumers share Mainnet initialization.
- Keep Pi payment settlement on the official Pi Platform API; a live protocol badge reports network state, not a guarantee of smart-contract support or payment success.