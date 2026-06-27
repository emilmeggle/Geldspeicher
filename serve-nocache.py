#!/usr/bin/env python3
# Dev-only static server that disables caching, so edits to ES modules / CSS
# are always picked up on reload (the stock http.server lets browsers cache modules).
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 7654
    ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()
