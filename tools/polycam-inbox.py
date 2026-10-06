# Polycam inbox -> E:/OTB-CAPTURE -> twin registration (operator request 2026-10-01; no Polycam API/MCP exists).
#
#   python tools/polycam-inbox.py            # one pass: ingest settled export sets, then register them
#   python tools/polycam-inbox.py --dry-run  # show what would be ingested
#   python tools/polycam-inbox.py --no-register
#
# Inboxes: G:/My Drive/00 OTB/Polycam-Inbox (phone -> Drive app) and C:/Users/adam/Downloads (desktop export).
# A Polycam export SET = files sharing one stem with at least .laz + .ply + .glb (that signature keeps unrelated
# Downloads out). Stems "m_d_yyyy[label]" take their capture date from the name; any other stem (e.g. "131 interior")
# takes the newest file's date and becomes the label. A set is ingested once every file is >= 2 min old (sync done).
# Each set is copied (never moved) to E:/OTB-CAPTURE/OTB_Capture_<date>/{02_originals_lidar,04_model_exports},
# sha256-verified, logged in 00_log/capture-log.md and recorded in E:/OTB-CAPTURE/polycam-inbox-ledger.json,
# then tools/register-polycam.py <key> runs for it. Inbox originals stay put - clear them by hand.
# Scheduled as "OTB-Polycam-Inbox" by tools/polycam-inbox.ps1 -Register.
import hashlib, json, re, shutil, subprocess, sys, time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CAP = Path("E:/OTB-CAPTURE")
DRIVE = Path("G:/My Drive/00 OTB/OTB-CAPTURE")   # operator 2026-10-06: Drive mirror of every filed set
INBOXES = [Path("G:/My Drive/00 OTB/Polycam-Inbox"), Path("C:/Users/adam/Downloads")]
LEDGER = CAP / "polycam-inbox-ledger.json"
LOG = CAP / "polycam-inbox.log"
EXTS = (".laz", ".ply", ".glb", ".dxf", ".zip")
REQUIRED = {".laz", ".ply", ".glb"}
SETTLE_S = 120
MAX_TRIES = 3
DATED = re.compile(r"^(\d{1,2})_(\d{1,2})_(\d{4})(.*)$")


def log(msg):
    line = f"{datetime.now().isoformat(timespec='seconds')} {msg}"
    print(line)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 22), b""):
            h.update(b)
    return h.hexdigest()


def laz_points(p):
    with open(p, "rb") as f:
        b = f.read(111)
    return int.from_bytes(b[107:111], "little")                       # LAS 1.2 legacy point count


def ply_points(p):
    with open(p, "rb") as f:
        head = f.read(4096).split(b"end_header")[0].decode("latin1")
    m = re.search(r"element vertex (\d+)", head)
    return int(m[1]) if m else -1


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def scan_key(stem, files):
    """-> (capture date YYYY-MM-DD, key). Key = date for a plain m_d_yyyy stem (matches the existing scans)."""
    m = DATED.match(stem)
    if m:
        date = f"{m[3]}-{int(m[1]):02d}-{int(m[2]):02d}"
        label = slug(m[4])
    else:
        date = datetime.fromtimestamp(max(f.stat().st_mtime for f in files)).strftime("%Y-%m-%d")
        label = slug(stem)
    return date, (f"{date}-{label}" if label else date)


def find_sets():
    sets = {}
    for box in INBOXES:
        if not box.is_dir():
            continue
        for f in box.iterdir():
            if f.is_file() and f.suffix.lower() in EXTS:
                sets.setdefault((box, f.stem), []).append(f)
    return {k: v for k, v in sets.items() if REQUIRED <= {f.suffix.lower() for f in v}}


def ingest(stem, files, ledger, dry):
    date, key = scan_key(stem, files)
    by_ext = {f.suffix.lower(): f for f in files}
    if sha256(by_ext[".laz"]) in ledger["by_laz_sha"]:
        return None                                                    # already ingested, or marked ignored
    if laz_points(by_ext[".laz"]) != ply_points(by_ext[".ply"]):
        # browsers number duplicate downloads per extension, so "x (1).ply" and "x (1).laz" can be different captures
        raise RuntimeError(f"{stem}: .laz and .ply point counts differ - files from different captures; file by hand")
    hashes = {f.suffix.lower(): sha256(f) for f in files}
    while key in ledger["keys"]:                                       # same name, different scan -> suffix
        key = key + "-b" if not re.search(r"-b+$", key) else key + "b"
    if dry:
        log(f"DRY would ingest {stem} -> {key} ({', '.join(sorted(hashes))})")
        return None
    dest = CAP / f"OTB_Capture_{date}"
    out_stem = key.replace("-", "_") if key != date else stem          # unique, filesystem-safe export stem
    for sub in ("00_log", "02_originals_lidar", "04_model_exports"):
        (dest / sub).mkdir(parents=True, exist_ok=True)
    copied = []
    for f in files:
        sub = "02_originals_lidar" if f.suffix.lower() == ".zip" else "04_model_exports"
        t = dest / sub / (out_stem + f.suffix.lower())
        if t.exists() and sha256(t) == hashes[f.suffix.lower()]:
            copied.append(t); continue
        if t.exists():
            raise RuntimeError(f"refusing to overwrite different file {t}")
        shutil.copy2(f, t)
        if sha256(t) != hashes[f.suffix.lower()]:
            raise RuntimeError(f"hash mismatch after copy: {t}")
        copied.append(t)
    with open(dest / "00_log/capture-log.md", "a", encoding="utf-8") as lg:
        lg.write(f"\n## {key} - Polycam export ingested {datetime.now():%Y-%m-%d %H:%M}\n"
                 f"Source: {files[0].parent} / {stem}.* (originals left in place)\n")
        for t in sorted(copied):
            lg.write(f"- {t.relative_to(dest).as_posix()} - {t.stat().st_size:,} B - sha256 {hashes[t.suffix][:16]}\n")
    rel = (dest / "04_model_exports" / out_stem).relative_to(CAP).as_posix()
    ledger["keys"][key] = {"stem": rel, "date": date, "source": str(files[0].parent / stem),
                           "ingested": datetime.now().isoformat(timespec="seconds"), "registered": None}
    ledger["by_laz_sha"][fingerprint] = key
    log(f"ingested {stem} -> {rel} ({len(copied)} files, verified)")
    mirror_to_drive(dest, copied)
    return key


def mirror_to_drive(dest, copied):
    """Copy the newly filed set (and its capture log) to the Drive mirror. Never fatal."""
    if not DRIVE.parent.is_dir():
        log("Drive not mounted - mirror skipped (the nightly OTB-Capture-Drive-Mirror task will catch up)"); return
    try:
        for t in [*copied, dest / "00_log/capture-log.md"]:
            d = DRIVE / t.relative_to(CAP)
            d.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(t, d)
        log(f"mirrored {len(copied)} files to Drive")
    except OSError as e:
        log(f"Drive mirror failed (non-fatal): {e}")


def seed_ledger():
    """First run: record the scans already filed by hand so they are neither re-copied nor re-registered."""
    ledger = {"keys": {}, "by_laz_sha": {}}
    for laz in sorted(CAP.glob("OTB_Capture_*/04_model_exports/*.laz")):
        date, key = scan_key(laz.stem, [laz])
        date = laz.parts[-3].removeprefix("OTB_Capture_")
        ledger["keys"][key] = {"stem": laz.with_suffix("").relative_to(CAP).as_posix(), "date": date,
                               "source": "filed before the inbox existed", "ingested": None, "registered": "pre-ledger"}
        ledger["by_laz_sha"][sha256(laz)] = key
    json.dump(ledger, open(LEDGER, "w"), indent=2)
    log(f"seeded ledger with {len(ledger['keys'])} existing scans")
    return ledger


def main():
    dry = "--dry-run" in sys.argv
    if not CAP.is_dir():
        print("E:/OTB-CAPTURE not mounted - skipping."); return 1
    ledger = json.load(open(LEDGER)) if LEDGER.exists() else seed_ledger()
    now = time.time()
    new = []
    for (box, stem), files in sorted(find_sets().items()):
        if any(now - f.stat().st_mtime < SETTLE_S for f in files):
            log(f"waiting on {stem} (still syncing)"); continue
        try:
            k = ingest(stem, files, ledger, dry)
        except Exception as e:                                          # one bad set never blocks the rest
            log(f"ERROR {stem}: {e}"); continue
        if k:
            new.append(k)
            json.dump(ledger, open(LEDGER, "w"), indent=2)
    # retry failed registrations (e.g. out of memory) on later passes, at most MAX_TRIES times
    pending = [k for k, v in ledger["keys"].items()
               if v["registered"] is None or (v["registered"].startswith("failed") and v.get("tries", 0) < MAX_TRIES)]
    if dry or "--no-register" in sys.argv or not pending:
        return 0
    for k in pending:
        r = subprocess.run([sys.executable, str(ROOT / "tools/register-polycam.py"), k],
                           cwd=ROOT, capture_output=True, text=True)
        tail = (r.stdout + r.stderr).strip().splitlines()[-1:] or [""]
        ledger["keys"][k]["tries"] = ledger["keys"][k].get("tries", 0) + 1
        ledger["keys"][k]["registered"] = "ok" if r.returncode == 0 else f"failed: {tail[0][:200]}"
        log(f"register {k}: {ledger['keys'][k]['registered']} | {tail[0][:300]}")
        json.dump(ledger, open(LEDGER, "w"), indent=2)
    return 0


if __name__ == "__main__":
    sys.exit(main())
