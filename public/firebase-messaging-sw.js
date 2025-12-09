// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyC8Nbj_6GYjkT57phPPyNeDKa5EeG784-g",
    authDomain: "edusync-d43c8.firebaseapp.com",
    projectId: "edusync-d43c8",
    storageBucket: "edusync-d43c8.firebasestorage.app",
    messagingSenderId: "786906978308",
    appId: "1:786906978308:web:43d09f3f99952514a2fd51",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Assignment Reminder';
  const notificationOptions = {
    body: payload.notification?.body || 'You have an upcoming assignment',
    icon: '/icon.svg',
    badge: '/logo.png',
    tag: payload.data?.assignmentId || 'assignment',
    data: payload.data,
    actions: [
      { action: 'open', title: 'View Assignment' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    const urlToOpen = event.notification.data?.link || '/dashboard/student/assignments';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window open
          for (let client of clientList) {
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              return client.focus();
            }
          }
          // Open new window if none exists
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});