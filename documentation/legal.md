## LEGAL.md 

The ChessBox source code is released under the MIT License (`documentation/LICENSE`).
The icons in `apps/desktop/src/assets/icons/` are **not** covered by that license — they are
Flaticon assets used under a **Flaticon Premium** subscription and keep their own license terms.

## Steps:

1. Repository & Licensing Architecture

   Isolate the assets: Ensure the README.md or main LICENSE file explicitly states that the contents of the `assets` folder are excluded from the main open-source license.

   Dual-license disclaimer: Add a note explaining that while the code is open-source, the visual assets retain their original proprietary licenses.

   Keep the license PDFs: The license PDF for each icon *pack* in use is kept in `apps/desktop/src/assets/licenses/`. One pack license covers every icon in that pack. Icons downloaded individually (none are currently shipped) have their own per-icon licenses, which must be added alongside if they are ever used.

   Check for raw distribution: Confirm that the icons are only distributed as part of the functional application, never hosted as a raw, downloadable "icon pack".

2. Flaticon Attribution

   Not required: The Premium tier removes Flaticon's attribution requirement, so no in-app, website or README credit is needed while icons are used under a Premium license.

   Optional: A short "Icons from Flaticon" credit in the README or an About screen is still a nice gesture, but it is not a license condition.

   If the subscription lapses: check Flaticon's current terms for how icons downloaded while subscribed are covered. Any icon added later under a free account would need attribution ("Icons designed by [Author Name] from Flaticon") in-app and in the README.

3. Branding & Trademark Boundaries

   App Logo check: Confirm that a Flaticon icon is not used as the main, trademarked logo/brand identity of the app. Flaticon prohibits using their icons as registered or official logos, regardless of subscription tier.

   No ownership claims: Ensure nothing in the documentation implies that you or the project's contributors created these graphics.

4. Installer & Distribution Compliance

   Bundled license text: Include this LEGAL.md (or a copy of the Flaticon license terms) in the final installer package so it copies over to the user's machine on installation.
