# Safe Storage

- On macOS, Electron/Chromium `safeStorage` stores the os_crypt password as a generic Keychain item whose service is `"<product> Safe Storage"` and whose account is `"<product> Key"`. Do not query the account as only the product name; `security find-generic-password -s "octopus-studio Safe Storage" -a "octopus-studio"` misses the real item, which is under `octopus-studio Key`.
- The opt-in `safe_storage_keychain_identity.spec.ts` fixture must pre-seed its temporary Keychain with the same account names (`octopus-studio Key` / `Chromium Key`). If it seeds bare `octopus-studio` / `Chromium`, the Layer 1 recovery test fails with `settings.githubAccessToken` undefined even though production lookup is correct.
