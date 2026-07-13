import json
from datetime import datetime, timezone
from pathlib import Path

from graphify.benchmark import run_benchmark, print_benchmark
from graphify.detect import save_manifest

detection = json.loads(Path('.graphify_detect.json').read_text())

# recompute corpus words over the KEPT text files only (detect's total_words
# was computed pre-filter over the whole repo)
words = 0
for cat in ('document', 'code'):
    for f in detection['files'].get(cat, []):
        try:
            words += len(Path(f).read_text(encoding='utf-8', errors='ignore').split())
        except Exception:
            pass
print(f'Corpus words (kept files): {words:,}')

result = run_benchmark('graphify-out/graph.json', corpus_words=words)
print_benchmark(result)

save_manifest(detection['files'])

extract = json.loads(Path('.graphify_extract.json').read_text())
input_tok = extract.get('input_tokens', 0)
output_tok = extract.get('output_tokens', 0)

cost_path = Path('graphify-out/cost.json')
cost = json.loads(cost_path.read_text()) if cost_path.exists() else {
    'runs': [], 'total_input_tokens': 0, 'total_output_tokens': 0}
cost['runs'].append({
    'date': datetime.now(timezone.utc).isoformat(),
    'input_tokens': input_tok,
    'output_tokens': output_tok,
    'files': detection.get('total_files', 0),
})
cost['total_input_tokens'] += input_tok
cost['total_output_tokens'] += output_tok
cost_path.write_text(json.dumps(cost, indent=2))

print(f'This run: {input_tok:,} input tokens, {output_tok:,} output tokens')
print(f"All time: {cost['total_input_tokens']:,} input, {cost['total_output_tokens']:,} output ({len(cost['runs'])} runs)")
