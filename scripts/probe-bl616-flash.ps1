# Developer diagnostic. Only ROM information/configuration/read/SHA commands.
param([string]$PortName = 'COM12')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$device = Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId.Contains('VID_349B&PID_6160') -and $_.FriendlyName.Contains("($PortName)") }
if (@($device).Count -ne 1) { throw 'Expected exactly one native BL616 ROM CDC port.' }
$port = [System.IO.Ports.SerialPort]::new($PortName, 115200, [System.IO.Ports.Parity]::None, 8, [System.IO.Ports.StopBits]::One)
$port.ReadTimeout = 3000; $port.WriteTimeout = 3000
$steps = [System.Collections.Generic.List[object]]::new()
$result = @{ port = $PortName; time = [DateTime]::UtcNow.ToString('o'); steps = $steps }
function Read-Exact([int]$Length) {
    $bytes = [byte[]]::new($Length)
    for ($i = 0; $i -lt $Length; $i++) { $bytes[$i] = $port.ReadByte() }
    return ,$bytes
}
function Read-Ack {
    $ack = Read-Exact 2
    if ($ack[0] -eq 70 -and $ack[1] -eq 76) { $code = Read-Exact 2; throw ('ROM FL 0x{0:x2}{1:x2}' -f $code[1], $code[0]) }
    if ($ack[0] -ne 79 -or $ack[1] -ne 75) { throw 'Expected fresh ROM OK.' }
}
function Command([byte]$Code, [byte[]]$Payload, [int]$ResponseMax = 0) {
    if ($Code -notin @(0x10,0x22,0x3b,0x36,0x32,0x3d)) { throw 'Forbidden diagnostic command.' }
    $frame = [byte[]]::new(4 + $Payload.Length)
    $frame[0] = $Code; $frame[2] = $Payload.Length -band 255; $frame[3] = $Payload.Length -shr 8
    [Array]::Copy($Payload,0,$frame,4,$Payload.Length)
    if ($Code -ne 0x10) { $sum = 0; for ($i=2;$i -lt $frame.Length;$i++) { $sum += $frame[$i] }; $frame[1] = $sum -band 255 }
    $step = @{ command = ('0x{0:x2}' -f $Code); payloadLength = $Payload.Length }; $steps.Add($step)
    try {
        $port.Write($frame,0,$frame.Length); Read-Ack
        if (!$ResponseMax) { $step.status = 'OK'; return ,([byte[]]::new(0)) }
        $size = Read-Exact 2; $length = [int]$size[0] + ([int]$size[1] -shl 8)
        if ($length -lt 1 -or $length -gt $ResponseMax) { throw "Invalid ROM response length $length" }
        $bytes = Read-Exact $length; $step.status = 'OK'; $step.responseLength = $length
        return ,$bytes
    } catch { $step.error = $_.Exception.Message; throw }
}
try {
    $port.Open(); $port.DiscardInBuffer(); $port.DiscardOutBuffer()
    $sync = [byte[]]::new(69); [Array]::Fill[byte]($sync,85)
    $port.Write($sync,0,$sync.Length); Read-Ack
    Start-Sleep -Milliseconds 150; $port.DiscardInBuffer()
    $boot = Command 0x10 @() 64
    if ($boot.Length -lt 20 -or [BitConverter]::ToUInt32($boot,0) -notin @(0x06160001,0x06160002)) { throw 'Unexpected BL616 ROM version.' }
    $result.bootInfo = [Convert]::ToHexString($boot).ToLowerInvariant()
    $null = Command 0x22 ([byte[]](@([BitConverter]::GetBytes([uint32]1)) + @([BitConverter]::GetBytes([uint32]115200))))
    $pin = ([BitConverter]::ToUInt32($boot,8) -shr 14) -band 63
    if ($pin -ne 2) { throw 'Expected stock Tang Nano internal-flash pin 2.' }
    $config = [BitConverter]::GetBytes([uint32](0x01014100 -bor $pin))
    $null = Command 0x3b $config
    $jedec = Command 0x36 @() 4; $result.jedec = [Convert]::ToHexString($jedec).ToLowerInvariant()
    if ($result.jedec -ne 'c8601600') { throw 'Diagnostic only supports the observed c8601600.' }
    $record = Get-Content -LiteralPath (Join-Path $taskRoot 'src/lib/bl616-flash-parameters.json') -Raw | ConvertFrom-Json
    $params = [Convert]::FromHexString($record.parameters.c86016.hex)
    if ($params.Length -ne 84 -or [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($params)).ToLowerInvariant() -ne $record.parameters.c86016.sha256) { throw 'Flash parameter hash mismatch.' }
    $null = Command 0x3b ([byte[]](@($config)+@($params)))
    $repeat = Command 0x36 @() 4; $result.repeatedJedec = [Convert]::ToHexString($repeat).ToLowerInvariant()
    $range = [byte[]](@([BitConverter]::GetBytes([uint32]0)) + @([BitConverter]::GetBytes([uint32]32)))
    $sample = Command 0x32 $range 32
    $sampleHash = [Security.Cryptography.SHA256]::HashData($sample)
    $result.sampleLength = $sample.Length; $result.sampleHash = [Convert]::ToHexString($sampleHash).ToLowerInvariant()
    $sha = Command 0x3d $range 32; $result.shaMatches = [Convert]::ToHexString($sha) -eq [Convert]::ToHexString($sampleHash)
} catch { $result.error = $_.Exception.Message }
finally {
    if ($port.IsOpen) { $port.Close() }; $port.Dispose()
    $json = $result | ConvertTo-Json -Depth 5
    $json | Set-Content -LiteralPath (Join-Path $taskRoot '.physical/rom-native-flash-probe.json')
    $json
}
