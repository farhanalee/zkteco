<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ZKTeco K40 Biometric Attendance Portal</title>
    <meta name="description" content="Open-source web-based ZKTeco K40/K50/K60 biometric fingerprint time attendance management system. TCP/IP direct socket (Port 4370), multi-site multi-terminal support, live monitoring, shift scheduling, reports & PDF export. No database required." />
    <meta name="keywords" content="ZKTeco, K40, K50, biometric attendance, fingerprint time attendance, TCP/IP, Port 4370, attendance management, shift management, employee management, open source, ZEM560, access control" />
    <meta name="author" content="Farhan Ali Mangi — Open Source Project" />
    <meta name="application-name" content="ZKTeco K40 Attendance Portal" />
    <meta name="theme-color" content="#050505" />

    <!-- Open Graph -->
    <meta property="og:title" content="ZKTeco K40 Biometric Attendance Portal — Open Source" />
    <meta property="og:description" content="Free open-source web portal for ZKTeco K40/K50 fingerprint attendance terminals. Multi-site, multi-terminal, live feed, reports, PDF export. No SQL required." />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="ZKTeco K40 Attendance Portal" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="ZKTeco K40 Attendance Portal — Open Source" />
    <meta name="twitter:description" content="Free, open-source biometric attendance management for ZKTeco hardware. TCP/IP, fingerprint, multi-site." />

    <!-- Open Source / License Notice -->
    <meta name="license" content="MIT — Free to use, modify and distribute with attribution." />

    <!-- Attendance Machine Info -->
    <!--
      Compatible Devices  : ZKTeco K40, K50, K60, F18, K20, iClock series
      Protocol            : ZKTeco ZKAPI / ADMS over TCP/IP (Port 4370)
      Biometric           : Optical fingerprint sensor (500 dpi)
      Verification Modes  : Fingerprint, RFID Card, PIN/Password
      Supported Firmware  : Ver 6.60 (ZEM560), ZEM500, ZEM800
      Capacity            : 3000 Users / 3000 FP Templates / 100,000 Attendance Records
    -->
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
