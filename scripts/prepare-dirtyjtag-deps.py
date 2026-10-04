"""Fetch pinned, hash-checked build inputs. Developer tooling; never run by students."""
from pathlib import Path
import concurrent.futures, hashlib, json, urllib.request

ROOT = Path(__file__).resolve().parents[1]
SDK_SHA = '6ebf1d053287e0417bb37e2322dfda9665febf86'
GCC_SHA = '072fc29d765774d66366c57a4d962e90c366ef1b'
DIRTY_SHA = '64fe564b82e509e9aa0ff3372a95ca5e2edf9230'

def tree(repo, sha):
    with urllib.request.urlopen(f'https://api.github.com/repos/{repo}/git/trees/{sha}?recursive=1', timeout=90) as response:
        data = json.load(response)
    if data.get('truncated'): raise ValueError('Incomplete Git tree for '+repo)
    return data['tree']

def fetch(repo, sha, item, root):
    target = (root / item['path']).resolve()
    assert target.is_relative_to(root.resolve()), str(target) + ' outside ' + str(root.resolve())
    def valid(data):
        return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest() == item['sha']
    if target.exists() and valid(target.read_bytes()): return
    url = f"https://raw.githubusercontent.com/{repo}/{sha}/{item['path']}"
    with urllib.request.urlopen(url, timeout=90) as response: data = response.read()
    if not valid(data): raise ValueError('Git blob hash mismatch: '+item['path'])
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)

def download(repo, sha, items, root):
    root.mkdir(parents=True, exist_ok=True)
    print(repo, sha, len(items), 'files', sum(x.get('size', 0) for x in items), 'bytes', flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        futures = [pool.submit(fetch, repo, sha, item, root) for item in items]
        for n, result in enumerate(concurrent.futures.as_completed(futures), 1):
            result.result()
            if n % 200 == 0: print('verified', n, '/', len(items), flush=True)

sdk = tree('bouffalolab/bouffalo_sdk', SDK_SHA)
prefixes = ('cmake/', 'bsp/common/', 'bsp/board/bl616dk/', 'drivers/lhal/', 'drivers/soc/bl616/std/',
            'drivers/sys/', 'components/os/', 'components/libc/', 'components/usb/',
            'components/utils/', 'components/mm/', 'components/lzma/', 'components/crypto/', 'components/debug/',
            'tools/pylib/', 'tools/memory_usage.py', 'tools/bflb_tools/bflb_fw_post_proc/bflb_fw_post_proc.exe',
            'tools/bflb_tools/bouffalo_flash_cube/chips/bl616/efuse_bootheader/flash_para.bin')
items = [x for x in sdk if x['type'] == 'blob' and (x['path'].startswith(prefixes) or x['path'].endswith('CMakeLists.txt') or '/' not in x['path'] or (x['path'].startswith('bsp/') and x['path'].count('/') == 1))]
download('bouffalolab/bouffalo_sdk', SDK_SHA, items, ROOT/'.tools/dirtyjtag-build/sdk')

gcc = tree('bouffalolab/toolchain_gcc_t-head_windows', GCC_SHA)
bins = {'gcc', 'g++', 'ar', 'as', 'ld', 'objcopy', 'objdump', 'size', 'ranlib', 'nm'}
def wanted(p):
    if p in {'bin/riscv64-unknown-elf-'+b+'.exe' for b in bins}: return True
    if p.startswith('riscv64-unknown-elf/bin/'): return True
    if p.startswith('riscv64-unknown-elf/lib/') and p.endswith('.specs'): return True
    if p.startswith('libexec/gcc/') and p.endswith(('cc1.exe', 'collect2.exe', 'lto-wrapper.exe', 'lto1.exe')): return True
    if p.startswith('riscv64-unknown-elf/include/') and '/c++/' not in p: return True
    if p.startswith('riscv64-unknown-elf/lib/rv32imafc/'): return True
    if p.startswith('lib/gcc/riscv64-unknown-elf/10.2.0/'):
        tail = p.split('10.2.0/', 1)[1]
        return '/' not in tail or tail.startswith(('include/', 'include-fixed/', 'rv32imafc/'))
    return p.endswith('.dll') or p in {'README.md', 'README'}
items = [x for x in gcc if x['type'] == 'blob' and wanted(x['path'])]
download('bouffalolab/toolchain_gcc_t-head_windows', GCC_SHA, items, ROOT/'.tools/dirtyjtag-build/gcc')

dirty = tree('pepijndevos/bl616_dirtyjtag', DIRTY_SHA)
download('pepijndevos/bl616_dirtyjtag', DIRTY_SHA, [x for x in dirty if x['type'] == 'blob'], ROOT/'hardware/dirtyjtag/upstream')
