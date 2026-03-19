self.addEventListener('install', (e) => {
    console.log('Service Worker: Installed');
});

self.addEventListener('fetch', (e) => {
    // এটি অ্যাপটিকে অফলাইনে কাজ করতে এবং ইনস্টল করার শর্ত পূরণ করতে সাহায্য করে
});