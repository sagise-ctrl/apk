# tugasly-admin — Analisa Struktur & Alur Push Notification (Android/Expo)

## Ringkasan Project

`tugasly-admin` adalah aplikasi **Expo (React Native)** yang difokuskan untuk menerima dan menampilkan **push notification** (FCM) di **Android** menggunakan library `expo-notifications`.

Tujuan utama saat ini:

- Meminta permission notifikasi
- Mengambil **FCM device token**
- Mendengarkan notifikasi masuk (`addNotificationReceivedListener`)
- Menampilkan riwayat notifikasi (title/body/time) dalam UI
- Menangani event ketika notifikasi di-tap (saat ini masih sebatas log)

---

## Teknologi & Dependensi Inti

- Expo SDK: `~56.x`
- React Native: `0.85.x`
- Push/Notifications: `expo-notifications`
- Device detection: `expo-device`
- Status/Constants: `expo-constants` (di `App.js` hanya di-import, tidak banyak dipakai)

---

## Struktur File Penting

Project ini masih sederhana (single-app):

### 1) Entrypoint

- **`index.js`**
  - Memanggil `registerRootComponent(App)` untuk men-register komponen root Expo.
  - Tidak ada routing layer.

### 2) Implementasi UI + Push Logic (utama)

- **`App.js`**
  - Menetapkan notification handler
  - Registrasi permission dan pengambilan push token
  - Subscribe listener untuk event:
    - `addNotificationReceivedListener`
    - `addNotificationResponseReceivedListener`
  - Render UI:
    - Token (jika sudah ada)
    - Riwayat notifikasi (FlatList)

### 3) Konfigurasi Expo & Android

- **`app.json`**
  - Nama/slug/version aplikasi
  - Icon & adaptive icon
  - Android package name: `id.my.tugasly`
  - Mengarah ke `google-services.json` melalui `android.googleServicesFile`
  - EAS projectId + updates url

- **`eas.json`**
  - Profile build: `development`, `preview`, `production`

- **`google-services.json`**
  - Konfigurasi Firebase Android untuk FCM.

### 4) Manifest & Metadata

- **`package.json`**
  - Dependencies & script (`expo start`, `expo start --android`, dst.)

- **`assets/*`**
  - Asset icon & splash yang dipakai saat packaging/build.

---

## Alur Runtime Aplikasi (End-to-End)

### A. Setup Notification Handler

Di `App.js`, saat app load:

1. Dipanggil:
   ```js
   Notifications.setNotificationHandler({
     handleNotification: async () => ({
       shouldShowAlert: true,
       shouldPlaySound: true,
       shouldSetBadge: true,
     }),
   });
   ```
2. Artinya:
   - Notifikasi akan ditampilkan alert
   - Sound akan diputar
   - Badge akan diset

### B. Registrasi Permission & Ambil Token (FCM)

Fungsi `registerForPushNotificationsAsync()` melakukan:

1. Validasi environment:
   - `Device.isDevice` harus `true` (device fisik)
2. Cek permission:
   - `getPermissionsAsync()`
   - Jika belum `granted`, request via `requestPermissionsAsync()`
3. Jika tetap tidak granted:
   - tampil `Alert.alert("Permission notifikasi ditolak!")`
   - token return `null`
4. Jika granted:
   - ambil token via `Notifications.getDevicePushTokenAsync()`
   - token di-`console.log("FCM_TOKEN:", token)`
   - token disimpan ke state `token`

### C. Subscribe Listener Notifikasi

Pada `useEffect(..., [])` (sekali saat mount):

1. **Listener diterima**
   - `Notifications.addNotificationReceivedListener((notification) => { ... })`
   - Saat notifikasi masuk:
     - `setNotifications(prev => [newItem, ...prev])`
     - `newItem` mengambil:
       - `notification.request.content.title`
       - `notification.request.content.body`
       - `time: new Date().toLocaleTimeString("id-ID")`

2. **Listener ketika notifikasi di-tap**
   - `Notifications.addNotificationResponseReceivedListener((response) => { ... })`
   - Saat ini:
     - hanya `console.log("Notif tapped:", response)`
     - tidak ada navigasi atau perubahan state lain

3. **Cleanup** saat unmount:
   - `removeNotificationSubscription(notificationListener.current)`
   - `removeNotificationSubscription(responseListener.current)`

### D. Rendering UI

Komponen UI utama:

- Header: `Tugasly Admin` + `Notifikasi Order`
- Token Box:
  - Jika `token` ada → tampilkan teks token `selectable`
  - Jika belum → `Menunggu token...`
- Riwayat Notifikasi:
  - Jika `notifications.length === 0` → `Belum ada notifikasi masuk.`
  - Jika ada → `FlatList` rendering kartu notifikasi

---

## Mapping: Konfigurasi ke Fitur yang Terjadi

- `app.json.android.googleServicesFile = ./google-services.json`
  - Memastikan konfigurasi Firebase untuk Android tersedia saat build.

- `expo-notifications` di `App.js`
  - Bertanggung jawab untuk:
    - handler tampil/sound/badge
    - permission request
    - ambil push token
    - menerima & men-track notifikasi

- UI token & riwayat
  - Menyediakan “dashboard sederhana” agar admin bisa:
    - menyalin FCM token
    - melihat notifikasi yang masuk

---

## Saran Pengembangan (Prioritas)

### 1) Tap Handling harus jadi aksi nyata (HIGH)

Saat ini `addNotificationResponseReceivedListener` hanya log.
Pengembangan yang disarankan:

- Parsing payload custom dari `response.notification.request.content.data`
- Contoh aksi:
  - Navigasi ke halaman detail order (butuh navigation/router)
  - Tandai notifikasi sebagai “read”

### 2) Persist riwayat notifikasi (HIGH)

Saat app restart, state `notifications` hilang.

- Simpan riwayat ke `AsyncStorage` atau storage lain
- Saat mount, baca ulang untuk menampilkan history

### 3) Simpan payload data custom, bukan hanya title/body (MED-HIGH)

FCM sering mengirim field custom seperti `orderId`, `status`, dll.

- Saat diterima:
  - simpan `notification.request.content.data` juga
- UI bisa menampilkan tambahan info atau dipakai saat tap.

### 4) Strategi token sync ke backend/admin panel (MED)

Saat ini token cuma tampil di UI.

- Tambahkan mekanisme:
  - kirim token ke backend saat token berubah
  - atau buat endpoint “register device token”

### 5) Refactor struktur file agar scalable (MED)

`App.js` saat ini memegang semuanya.

- Pisahkan menjadi modul:
  - `notifications/registerForPushNotificationsAsync`
  - `notifications/notificationHandlers`
  - `components/NotificationHistoryList`

### 6) Robustness & kualitas data (LOW-MED)

- Tambahkan fallback jika `title/body` null
- Batasi jumlah history (mis. max 50 item) agar tidak membengkak

---

## Checklist File yang Paling Penting untuk Dipahami

1. **`App.js`** — semua flow push + UI
2. **`app.json`** — koneksi ke Firebase via `googleServicesFile` + konfigurasi Android packaging
3. **`google-services.json`** — sumber konfigurasi Firebase/FCM untuk Android
4. **`eas.json`** — konfigurasi build/publishing
5. **`index.js`** — bootstrap Expo
6. **`package.json`** — dependency & script

---

## Catatan Keamanan

- Pastikan kredensial sensitif tidak diexpose di versi repo publik.
- `google-services.json` berisi metadata Firebase. Jika repository publik, lakukan audit/kebijakan sesuai standar tim.
