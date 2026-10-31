; CelestialWorship Connect: installs for this Windows user only, so no administrator is needed.
; It starts with the computer, out of sight, and the Live Studio can wake it with a link.
#define AppVersion GetEnv("CONNECT_VERSION")

[Setup]
AppId={{7F4B4B62-30B1-4F3E-9E36-3C0F3A2B9C11}
AppName=CelestialWorship Connect
AppVersion={#AppVersion}
AppPublisher=CelestialWorship
AppPublisherURL=https://celestialworship.online
DefaultDirName={localappdata}\Programs\CelestialWorship Connect
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\..\installer
OutputBaseFilename=CelestialWorshipConnect-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName=CelestialWorship Connect
CloseApplications=force
ArchitecturesInstallIn64BitMode=x64compatible

[Files]
Source: "..\..\out-installed\*"; DestDir: "{app}"; Flags: ignoreversion

[Registry]
; With the computer
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "CelestialWorship Connect"; ValueData: """{app}\CelestialWorshipConnect.exe"""; Flags: uninsdeletevalue
; So the Live Studio's "Open it" link works
Root: HKCU; Subkey: "Software\Classes\celestialworship-connect"; ValueType: string; ValueData: "URL:CelestialWorship Connect"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\celestialworship-connect"; ValueType: string; ValueName: "URL Protocol"; ValueData: ""
Root: HKCU; Subkey: "Software\Classes\celestialworship-connect\shell\open\command"; ValueType: string; ValueData: """{app}\CelestialWorshipConnect.exe"""

[Run]
Filename: "{app}\CelestialWorshipConnect.exe"; Flags: nowait runhidden skipifnotsilent
Filename: "{app}\CelestialWorshipConnect.exe"; Description: "Start CelestialWorship Connect now"; Flags: nowait postinstall runhidden

[UninstallRun]
Filename: "{sys}\taskkill.exe"; Parameters: "/F /IM CelestialWorshipConnect.exe"; Flags: runhidden; RunOnceId: "StopConnect"

[Code]
function PrepareToInstall(var NeedsRestart: Boolean): String;
var Code: Integer;
begin
  // An older copy may be running; it is replaced, and started again at the end
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM CelestialWorshipConnect.exe', '', SW_HIDE, ewWaitUntilTerminated, Code);
  Result := '';
end;
