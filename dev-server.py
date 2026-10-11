"""Local storefront preview without stale HTML/JS caches. Not production hosting."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class PreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    handler = partial(PreviewHandler, directory=str(Path(__file__).resolve().parent))
    print("Euro Padel local preview: http://127.0.0.1:4173 (cache disabled)", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 4173), handler).serve_forever()
