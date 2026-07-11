import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { magazineContentDir } from '../../features/magazine/helpers/contentDir';

/*
 * Astro's content collections strip non-image assets from the build, so
 * the PDFs and FB2s that editors upload via the admin (or that land via
 * direct content commits) never reach `dist/`. Each format gets its own
 * integration so the build log names what it copied; both share this
 * pass.
 *
 * Source is whichever issues directory the content repo currently ships
 * (see features/magazine/helpers/contentDir); the destination is always
 * `dist/magazine/{slug}/assets/`, which is what the download links and
 * the `_headers` MIME rules advertise.
 */

/**
 * Copy every issue asset with the given extension into the dist tree.
 * @param distRoot - Absolute path of the build output directory.
 * @param ext - Lower-case extension including the leading dot.
 * @returns How many files were copied.
 */
export const copyIssueAssets = (distRoot: string, ext: string): number => {
  const contentDir = magazineContentDir();
  if (!existsSync(contentDir)) return 0;

  let copied = 0;
  for (const slug of readdirSync(contentDir)) {
    const assetsDir = join(contentDir, slug, 'assets');
    if (!existsSync(assetsDir) || !statSync(assetsDir).isDirectory()) continue;

    const targetDir = join(distRoot, 'magazine', slug, 'assets');
    for (const file of readdirSync(assetsDir)) {
      if (extname(file).toLowerCase() !== ext) continue;
      mkdirSync(targetDir, { recursive: true });
      copyFileSync(join(assetsDir, file), join(targetDir, file));
      copied += 1;
    }
  }
  return copied;
};
