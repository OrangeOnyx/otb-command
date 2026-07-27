#!/usr/bin/env python3
"""Render the commercial voice-over and embed it into docs/pitch/commercial.html.

Voice: ElevenLabs "Jack John" (same as AI-1) · model eleven_turbo_v2_5.
Lines = the 90-second master script (docs/pitch/commercial-script.md) — keep
both in sync if the script changes.

Key drill (never in chat/repo/disk permanently):
  npx vercel env pull <tmpfile> --environment=production --yes \
      --scope adams-projects-0c52918e
  python tools/render-commercial-vo.py --env <tmpfile>   # then DELETE tmpfile
Or export ELEVENLABS_API_KEY and run with no args.

Injection: replaces the `const AUDIO = [];` line in commercial.html with
per-scene data-URIs (idempotent — safe to re-run; the marker comment is kept).
MP3s are also written to --out (default: OTB export dir NOT in repo) for
external video assembly.
"""
import argparse, base64, os, re, sys, urllib.request

VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "7EzWGsX10sAS4c9m9cPf")
MODEL = "eleven_turbo_v2_5"
OUTPUT_FORMAT = "mp3_44100_64"
HTML = os.path.join(os.path.dirname(__file__), "..", "docs", "pitch", "commercial.html")

LINES = [
    "A shopping center runs on memory. Paper leases. A binder on a shelf. Somebody's inbox.",
    "This one is different. We rebuilt ours — as software.",
    "Seventeen cameras watch the parking field. Thirty-four stalls, classified every five minutes. "
    "Occupancy here isn't a guess in a spreadsheet — it's measured.",
    "The A I is allowed to talk. It is not allowed to guess. Every dollar in every answer must trace "
    "to a deterministic formula — or the answer is thrown away, and recalculated.",
    "Every payment. Every signature. Every compliance change. Recorded forever — corrections are new "
    "entries. Nothing is ever erased.",
    "At 2 a.m., the phone answers with our policies. A leak gets dispatched. A leasing call gets a "
    "tour booked. Every call becomes a transcript.",
    "And on the first of the month, the owner receives a brief no one had to remember to write — "
    "and no A I was allowed to embellish.",
    "One property proved it, end to end. The next twenty are the point. Orange Ocean Atlas — "
    "built by an operator, for the owners of real places.",
]


def load_key(env_file):
    if env_file:
        for line in open(env_file, encoding="utf-8"):
            m = re.match(r'^ELEVENLABS_API_KEY="?([^"\r\n]+)"?', line.strip())
            if m:
                return m.group(1)
        sys.exit("ELEVENLABS_API_KEY not found in env file")
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        sys.exit("Set ELEVENLABS_API_KEY or pass --env <pulled-env-file>")
    return key


def tts(key, text):
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}?output_format={OUTPUT_FORMAT}",
        data=__import__("json").dumps({"text": text, "model_id": MODEL}).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--env", help="path to a pulled Vercel env file (delete it after)")
    ap.add_argument("--out", help="also write per-scene MP3s here")
    args = ap.parse_args()
    key = load_key(args.env)

    uris = []
    for n, line in enumerate(LINES, 1):
        audio = tts(key, line)
        uris.append("data:audio/mpeg;base64," + base64.b64encode(audio).decode())
        if args.out:
            os.makedirs(args.out, exist_ok=True)
            open(os.path.join(args.out, f"vo-scene{n}.mp3"), "wb").write(audio)
        print(f"scene {n}: {len(audio):,} bytes")

    html = open(HTML, encoding="utf-8").read()
    # non-greedy across the (possibly already-filled) array: data-URIs carry
    # ';' so [^;]* only ever matched the EMPTY array — re-runs need re.S + .*?
    marker = re.compile(r"const AUDIO = \[.*?\]; /\* VO_INJECT[^*]*\*/", re.S)
    if not marker.search(html):
        sys.exit("VO_INJECT marker not found in commercial.html")
    payload = ("const AUDIO = [\n    '" + "',\n    '".join(uris)
               + "'\n  ]; /* VO_INJECT: tools/render-commercial-vo.py fills this with per-scene data-URIs */")
    open(HTML, "w", encoding="utf-8").write(marker.sub(lambda _: payload, html))
    print(f"injected {len(uris)} scenes into {os.path.normpath(HTML)}")


if __name__ == "__main__":
    main()
