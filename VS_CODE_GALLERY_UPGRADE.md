# Libaas gallery upgrade — VS Code copy-and-paste steps

This upgrade fixes only the product-media issue. It gives each suit its own ordered gallery of up to six images, removes the shared three-piece fallback that could show another suit’s images, adds a separate Studio-controlled **Cut to Move** image sequence, and adds a separately confirmed removal action for a product and its **local** Studio gallery files.

> Do not paste a partial file into a random location. The source archive contains the exact replacement files with their correct folders. First make a backup of your project, then extract the archive at your project root.

| Step | Paste this into the VS Code terminal |
|---|---|
| 1. Open the project | `cd /path/to/your/libass-by-haya` |
| 2. Back up the current code and local data | `mkdir -p ../libaas-backup && cp -a client server data ../libaas-backup/` |
| 3. Copy the attached archive into the project root | `cp /path/to/libaas-gallery-upgrade-source.zip .` |
| 4. Apply the replacement files | `unzip -o libaas-gallery-upgrade-source.zip` |
| 5. Install packages, if needed | `pnpm install` |
| 6. Check the code | `pnpm check` |
| 7. Run the automated checks | `pnpm test` |
| 8. Start locally | `pnpm dev` |

After starting, open the local address shown by the terminal. Sign into **Studio**, select one suit in **Six separate views per suit**, and upload its front, back, detail, editorial, or other views. Each suit can have a maximum of six views, and the left/right buttons change the order for that suit only.

The new **Cut to Move media** panel is separate. Add up to six movement frames there; those images appear only in the homepage Cut to Move section and cannot enter any suit gallery.

The **Remove product + managed views** control needs confirmation. It hides the product from the public store and deletes only its locally stored suit-gallery files. Historic COD orders stay intact. Cloudinary category assets are intentionally separate because they are not linked to a product handle; use the dedicated Cloudinary library to delete a named remote asset deliberately.
