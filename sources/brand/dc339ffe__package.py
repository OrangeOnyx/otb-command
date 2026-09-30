from pathlib import Path
import hashlib,zipfile
R=Path(__file__).resolve().parent.parent
files=sorted(p for p in R.rglob('*') if p.is_file() and p.name!='MANIFEST.sha256' and '__pycache__' not in p.parts and p.relative_to(R).parts[0] != R.name)
(R/'MANIFEST.sha256').write_text('\n'.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.relative_to(R).as_posix() for p in files)+'\n',encoding='utf-8')
archive=R.parent/(R.name+'.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in files+[R/'MANIFEST.sha256']:z.write(p,R.name+'/'+p.relative_to(R).as_posix())
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for p in files:assert z.read(R.name+'/'+p.relative_to(R).as_posix())==p.read_bytes()
print('Verified archive:',archive.name,'files:',len(files)+1,'bytes:',archive.stat().st_size)

