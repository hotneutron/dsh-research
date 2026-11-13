"""Qualify a native bwrap device adapter before enabling the GPU fixture profile."""
from pathlib import Path
import hashlib
import json
import os
import shutil
import stat
import subprocess
import re


def configure(profile, output, source_root):
    device='GPU-b356e84d-b220-a33c-dd68-3ea01ec109ea'
    records=[p.read_text() for p in Path('/proc/driver/nvidia/gpus').glob('*/information')]
    matches=[value for value in records if re.search(r'^GPU UUID:\s*'+re.escape(device)+r'\s*$',value,re.MULTILINE)]
    assert len(matches)==1, 'Exact GPU driver record is unavailable'
    minor=int(re.search(r'Device Minor:\s*(\d+)',matches[0]).group(1))
    paths=['/dev/nvidiactl','/dev/nvidia'+str(minor)]+[p for p in ['/dev/nvidia-uvm','/dev/nvidia-uvm-tools'] if Path(p).exists()]
    devices=[]
    for name in paths:
        info=Path(name).lstat();assert stat.S_ISCHR(info.st_mode)
        devices.append({'path':name,'identity':[os.major(info.st_rdev),os.minor(info.st_rdev)]})
    runner=output/'gpu-sandbox-runner.py';shutil.copyfile(source_root/'tools/dsh_research/gpu_sandbox_runner.py',runner)
    binding={'schema_version':1,'root':str(output),'device_uuid':device,'devices':devices,'bwrap':shutil.which('bwrap'),
        'file_policy':'native read-only root, writable qualification root/temp; exact GPU device IO exceptions'}
    assert binding['bwrap']
    data=(json.dumps(binding,sort_keys=True)+'\n').encode();path=output/'gpu-sandbox-binding.json';path.write_bytes(data);path.chmod(0o600)
    digest=hashlib.sha256(data).hexdigest();command=['/usr/bin/python3',str(runner),str(path),digest]
    base=['--ro-bind','/','/','--dev','/dev','--unshare-pid','--proc','/proc','--die-with-parent','--tmpfs','/tmp','--bind',str(output),str(output),'--']
    allowed=output/'sandbox-owned-write';outside=output.parent/(output.name+'-outside-write-probe')
    outside.write_text('retained outside value\n')
    probes=[]
    for name,argv,success in [
        ('gpu-visible',['nvidia-smi','--id='+device,'--query-gpu=uuid','--format=csv,noheader'],True),
        ('owned-write',['/usr/bin/python3','-c','from pathlib import Path;Path('+repr(str(allowed))+').write_text("owned")'],True),
        ('outside-write-refused',['/usr/bin/python3','-c','from pathlib import Path;Path('+repr(str(outside))+').write_text("violation")'],False)]:
        result=subprocess.run(command+base+argv,text=True,capture_output=True,timeout=10)
        assert (result.returncode==0)==success,(name,result.returncode,result.stderr)
        probes.append({'name':name,'exit_code':result.returncode,'stdout':result.stdout,'stderr':result.stderr})
    assert outside.read_text()=='retained outside value\n'
    (output/'gpu-sandbox-qualification.json').write_text(json.dumps({'binding_sha256':digest,'runner_sha256':hashlib.sha256(runner.read_bytes()).hexdigest(),
        'probes':probes,'filesystem_confinement_preserved':True},indent=2)+'\n')
    entries=json.loads((profile/'cordis.patch.yml').read_text());entries.append({'id':'sandbox','config':{'runnerCommand':command,'runnerFailureSignatures':['DSH_GPU_SANDBOX_REFUSED']}})
    (profile/'cordis.patch.yml').write_text(json.dumps(entries,indent=2)+'\n')
    return {'path':str(path),'sha256':digest,'size_bytes':len(data),'device_uuid':device,'devices':devices}
