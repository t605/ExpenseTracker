// Normal `npm run dev` / `npm run build` / `npm start` are unchanged. The GitHub Pages workflow sets
// STATIC_EXPORT=1 (plain files in /out) and NEXT_PUBLIC_BASE_PATH=/<repository-name> (the site lives in a sub-folder).
const staticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(staticExport ? { output: "export" } : {}),
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
