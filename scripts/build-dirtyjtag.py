"""Build and publish the pinned BL616 firmware. No device is opened by this script."""
from pathlib import Path
import hashlib, json, os, shutil, struct, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT/'.tools/dirtyjtag-build'
APP = BUILD/'app'
SDK = BUILD/'sdk'
UPSTREAM = ROOT/'hardware/dirtyjtag/upstream'
APP.mkdir(parents=True, exist_ok=True)
for item in UPSTREAM.iterdir():
    if item.is_dir(): shutil.copytree(item, APP/item.name, dirs_exist_ok=True)
    elif item.suffix != '.bin': shutil.copy2(item, APP/item.name)
# Keep the pinned upstream untouched; maintained fixes are compiled in its place.
for item in (ROOT/'hardware/dirtyjtag/overrides').glob('*'):
    if item.suffix in {'.c', '.h'}: shutil.copy2(item, APP/'src'/item.name)

# MS OS 2.0: bind WinUSB only to vendor interface 0; CDC 1/2 stays usbser.
name = ('DeviceInterfaceGUIDs\0').encode('utf-16-le')
guid = ('{11F92E43-591F-4F45-9057-47F4B31830A2}\0\0').encode('utf-16-le')
prop = struct.pack('<HHHH', 10+len(name)+len(guid), 4, 7, len(name)) + name + struct.pack('<H', len(guid)) + guid
compatible = struct.pack('<HH',20,3) + b'WINUSB\0\0' + bytes(8)
function = struct.pack('<HHBBH',8,2,0,0,8+len(compatible)+len(prop)) + compatible + prop
# The configuration subset header takes the zero-based configuration index (TinyUSB's
# reference descriptor uses 0), not bConfigurationValue 1.
config = struct.pack('<HHBBH',8,1,0,0,8+len(function)) + function
msos = struct.pack('<HHIH',10,0,0x06030000,10+len(config)) + config
bos = struct.pack('<BBHB',5,15,33,1) + struct.pack('<BBBB',28,16,5,0) + bytes.fromhex('df60ddd88945c74c9cd2659d9e648a9f') + struct.pack('<IHBB',0x06030000,len(msos),0x20,0)
def cbytes(name, data): return 'static const uint8_t '+name+'[] = {\n    '+', '.join(f'0x{x:02x}' for x in data)+'\n};\n'
overlay = '#include "bflb_efuse.h"\n' + cbytes('yosis_msos20',msos) + cbytes('yosis_bos',bos) + '''
static const struct usb_msosv2_descriptor yosis_msos = {
    .compat_id = yosis_msos20, .compat_id_len = sizeof(yosis_msos20), .vendor_code = 0x20,
};
static const struct usb_bos_descriptor yosis_bos_descriptor = {
    .string = yosis_bos, .string_len = sizeof(yosis_bos),
};
static char yosis_serial[17];
'''
(APP/'src/yosis_usb.inc').write_text(overlay)
source = (APP/'src/usb_descriptors.c').read_text()
source = source.replace('USB_DEVICE_DESCRIPTOR_INIT(USB_2_0,', 'USB_DEVICE_DESCRIPTOR_INIT(0x0201,').replace('USBD_PID, 0x0200,', 'USBD_PID, 0x0203,')
source = source.replace('const struct usb_descriptor dirtyjtag_descriptor', '#include "yosis_usb.inc"\n\nconst struct usb_descriptor dirtyjtag_descriptor')
source = source.replace('.device_quality_descriptor_callback = device_quality_descriptor_callback,', '.device_quality_descriptor_callback = NULL,')
source = source.replace('.other_speed_descriptor_callback = other_speed_config_descriptor_callback,', '.other_speed_descriptor_callback = NULL,')
source = source.replace('.string_descriptor_callback = string_descriptor_callback,', '.string_descriptor_callback = string_descriptor_callback,\n    .msosv2_descriptor = &yosis_msos,\n    .bos_descriptor = &yosis_bos_descriptor,')
# Include precedes the callback so the per-chip serial is visible there.
source = source.replace('#include "yosis_usb.inc"\n\nconst', 'const')
source = source.replace('static const char *string_descriptor_callback', '#include "yosis_usb.inc"\n\nstatic const char *string_descriptor_callback')
source = source.replace('return string_descriptors[index];', 'if (index == 3) return yosis_serial;\n    return string_descriptors[index];')
source = source.replace('usbd_desc_register(busid, &dirtyjtag_descriptor);', '''uint8_t chip[8] = {0};
    bflb_efuse_get_chipid(chip);
    static const char hex[] = "0123456789abcdef";
    for (unsigned i = 0; i < 8; ++i) {
        yosis_serial[i*2] = hex[chip[i] >> 4]; yosis_serial[i*2+1] = hex[chip[i] & 15];
    }
    usbd_desc_register(busid, &dirtyjtag_descriptor);''')
(APP/'src/usb_descriptors.c').write_text(source)
# Full-speed USB conforms to the protocol's 64-byte packets (upstream HS uses 64).
cmake_source = (APP/'CMakeLists.txt').read_text().replace('sdk_add_compile_definitions(-DCONFIG_USB_HS)', '')
(APP/'CMakeLists.txt').write_text(cmake_source)
generated = APP/'build/generated'
generated.mkdir(parents=True, exist_ok=True)
(generated/'defconfig.cmake').write_text('set(CONFIG_ROMAPI y)\nset(CONFIG_DEBUG y)\nset(CONFIG_TLSF y)\nset(CONFIG_COREDUMP y)\n')
env = os.environ.copy(); env['BL_SDK_BASE'] = SDK.as_posix()
env['PATH'] = str(BUILD/'gcc/bin') + os.pathsep + env['PATH']
cmake = BUILD/'python/cmake/data/bin/cmake.exe' if os.name == 'nt' else shutil.which('cmake')
ninja = BUILD/'python/bin/ninja.exe' if os.name == 'nt' else shutil.which('ninja')
if not cmake or not ninja: raise RuntimeError('Developer build needs CMake and Ninja.')
cmake, ninja = Path(cmake), Path(ninja)
def run(*args): subprocess.run([str(x) for x in args], cwd=APP, env=env, check=True)
run(cmake,'-S','.', '-B','build','-G','Ninja',f'-DCMAKE_MAKE_PROGRAM={ninja.as_posix()}',
    '-DCHIP=bl616','-DBOARD=bl616dk','-DCPU_MODEL=a0','-DCROSS_COMPILE=riscv64-unknown-elf-',
    '-DBUILD_DIR=build',f'-DSDK_DEMO_PATH={APP.as_posix()}','-DVSCODE_PARSE_EN=n')
run(cmake,'--build','build','-j','8')
run(cmake,'--build','build','--target','combine')
bins = list((APP/'build/build_out').glob('bl616_dirtyjtag_bl616*.bin'))
if len(bins) != 1: raise ValueError('Expected one postprocessed firmware: '+str(bins))
firmware = bins[0].read_bytes()
boot = (UPSTREAM/'bl616_bootloader_0x20000_nano20k_signed.bin').read_bytes()
if not 0 < len(boot) <= 0x20000 or not 4096 < len(firmware) < 0x40000: raise ValueError('Invalid image size')
dest = ROOT/'public/firmware/dirtyjtag'; dest.mkdir(parents=True,exist_ok=True)
artifacts = []
for name, address, data in [('bootloader.bin',0,boot),('dirtyjtag.bin',0x20000,firmware)]:
    (dest/name).write_bytes(data)
    artifacts.append({'name': name,'address':address,'size':len(data),'sha256':hashlib.sha256(data).hexdigest()})
manifest = {'version':1,'board':'tangnano20k','build':'dirtyjtag-v2-yosis-winusb-3',
            'upstream':'64fe564b82e509e9aa0ff3372a95ca5e2edf9230','sdk':'6ebf1d053287e0417bb37e2322dfda9665febf86',
            'usb':{'vid':0x1209,'pid':0xc0ca,'interface':0,'bcdDevice':0x0203,'msos20':True},'images':artifacts}
(ROOT/'src/lib/dirtyjtag-package.json').write_text(json.dumps(manifest,indent=2)+'\n')
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(ROOT/'hardware/dirtyjtag/yosis_usb.inc').write_text(overlay)
subprocess.run([sys.executable, str(ROOT/'scripts/publish-dirtyjtag-notices.py')], check=True)
print(json.dumps(manifest,indent=2))
