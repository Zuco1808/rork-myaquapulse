=================================================
  MyAquaPulse - Vodič za pokretanje projekta
=================================================

PREDUVJETI
----------
Provjeri je li instalirano (pokreni u terminalu):

  node --version    (treba biti 18+)
  npm --version
  git --version

Ako nije instalirano, preuzmi s:
  - Node.js : https://nodejs.org (LTS verzija)
  - Git     : https://git-scm.com


POKRETANJE PROJEKTA
-------------------
1. Kloniraj repozitorij:
   git clone https://github.com/Zuco1808/rork-myaquapulse.git

2. Uđi u folder:
   cd rork-myaquapulse\expo

3. Instaliraj dependencies:
   npm install --legacy-peer-deps

4. Pokreni aplikaciju:
   npm start

5. Otvori browser na:
   http://localhost:8081


LOGIN PODACI
------------
  Email    : admin@vodovod.com
  Password : Admin123!


RJEŠAVANJE PROBLEMA
-------------------
Port zauzet:
  npm start -- --port 8082

Cache problem:
  npx expo start --clear

Dependency greška:
  Remove-Item -Recurse -Force node_modules
  npm install --legacy-peer-deps


SUPABASE
--------
Baza podataka, Edge Functions i secrets su na cloudu.
Ne trebaš ništa dodatno postavljati.
Samo pokreni app i sve radi.

  URL     : https://irttfsfgticapomdlibs.supabase.co
  Tabele  : bills, companies, locations, meter_readings,
            notifications, pricing_packages, profiles,
            tasks, user_groups, water_alerts, water_meters

  Edge Functions:
    - ocr-meter        (Claude Vision OCR)
    - send-notification (Push notifikacije)


TEHNIČKI STACK
--------------
  Frontend : React Native + Expo Router (TypeScript)
  Backend  : Supabase (PostgreSQL + Edge Functions)
  Auth     : Supabase Auth
  OCR      : Anthropic Claude Vision (Haiku)
  Storage  : Supabase Storage (meter-images bucket)


GITHUB
------
  https://github.com/Zuco1808/rork-myaquapulse


=================================================
