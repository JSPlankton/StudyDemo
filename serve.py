from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import argparse
import mimetypes


MIME_TYPES = {
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".webmanifest": "application/manifest+json",
    ".svg": "image/svg+xml",
    ".json": "application/json",
}


class StudyAppHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        **MIME_TYPES,
    }


def main():
    parser = argparse.ArgumentParser(description="Serve the study app with browser-safe module MIME types.")
    parser.add_argument("--directory", default=".", help="Static directory to serve.")
    parser.add_argument("--host", default="127.0.0.1", help="Host address.")
    parser.add_argument("--port", default=4174, type=int, help="Port number.")
    args = parser.parse_args()

    for extension, mime_type in MIME_TYPES.items():
        mimetypes.add_type(mime_type, extension)

    handler = partial(StudyAppHandler, directory=args.directory)
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Serving {args.directory} at http://{args.host}:{args.port}/index.html")
    server.serve_forever()


if __name__ == "__main__":
    main()
