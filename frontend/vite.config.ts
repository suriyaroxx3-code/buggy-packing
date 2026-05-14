// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * bypassSsr — intercepts every page request BEFORE TanStack Start's SSR
 * middleware runs and returns a plain HTML shell that boots spa-entry.jsx.
 *
 * Why: This app stores all data in localStorage — SSR gives no benefit.
 * TanStack Start's renderToReadableStream throws during shell rendering
 * (HeadContent / Scripts) and h3 wraps the rejection as a 500 HTTPError.
 * Bypassing SSR completely eliminates that error path.
 */
function bypassSsr() {
  return {
    name: "brushpack:bypass-ssr",
    enforce: "pre" as const,
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        async (req: IncomingMessage, res: ServerResponse, next: Function) => {
          const url = req.url ?? "/";

          // Pass through Vite internals, static assets, and API calls
          if (
            url.startsWith("/@") ||
            url.startsWith("/node_modules") ||
            url.startsWith("/__lovable") ||
            url.startsWith("/api") ||
            /\.[a-zA-Z0-9]{1,10}(\?.*)?$/.test(url)
          ) {
            return next();
          }

          try {
            // Let Vite inject HMR client + React Refresh preamble into our shell
            const html = await server.transformIndexHtml(
              url,
              `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BrushPack</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/spa-entry.jsx"></script>
  </body>
</html>`
            );
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(html);
          } catch (e) {
            next(e);
          }
        }
      );
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [bypassSsr()],
    server: {
      // Prevent the TanStack Router plugin from triggering full reloads
      // when routeTree.gen.ts is auto-regenerated.
      watch: {
        // Ignore the generated file so its writes don't cause extra HMR cycles.
        ignored: ["**/routeTree.gen.ts"],
      },
      hmr: {
        overlay: false,
      },
    },
  },
});
