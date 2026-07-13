import json
from pathlib import Path
from graphify.detect import detect

repo = Path(r'C:\Users\adam\Downloads\otb-command-claude-code-kit\otb-command')
result = detect(repo)

EXCLUDE_DIRS = {'node_modules', 'dist', '.vercel', '.git', 'marketing', 'public', 'baseline'}

def excluded(p):
    p = Path(p)
    try:
        rel = p.relative_to(repo) if p.is_absolute() else p
    except ValueError:
        return False
    parts = rel.parts
    if any(part in EXCLUDE_DIRS for part in parts):
        return True
    if parts and parts[0].startswith('export'):
        return True
    if len(parts) >= 2 and parts[0] == 'docs' and parts[1] == 'graph':
        return True
    if rel.suffix.lower() in ('.ksplat', '.glb', '.ply'):
        return True
    if rel.name == 'package-lock.json':
        return True
    if 'graphify-out' in parts:
        return True
    # images: keep only the knowledge-bearing roof-brief frames
    if rel.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'):
        if not (len(parts) >= 2 and parts[0] == 'docs' and parts[1] == 'roof-brief-assets'):
            return True
    return False

filtered = {}
dropped = 0
for cat, files in result.get('files', {}).items():
    keep = [f for f in files if not excluded(f)]
    dropped += len(files) - len(keep)
    if keep:
        filtered[cat] = keep

result['files'] = filtered
result['total_files'] = sum(len(v) for v in filtered.values())
Path('.graphify_detect.json').write_text(json.dumps(result))

print(f"kept {result['total_files']} files, dropped {dropped} noise files")
print(f"total_words: {result.get('total_words')}")
print(f"skipped_sensitive: {len(result.get('skipped_sensitive', []))}")
for cat, files in filtered.items():
    print(f"  {cat}: {len(files)}")
