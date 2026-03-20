// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker Registered'))
            .catch(err => console.log('Service Worker Error: ', err));
    });
}






document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    setDefaultDates();
    initGlobalDates();
    loadAllData();

    if(typeof loadProfileData === 'function') loadProfileData();

    // --- Tom Select for Smart Bazar Search ---
    const tempItemSelect = document.getElementById('temp-item-name');
    if (tempItemSelect) {
        new TomSelect(tempItemSelect, {
            create: true, 
            sortField: [], // ম্যাজিক: এটি ফাঁকা রাখলে HTML এর অরিজিনাল সিরিয়াল ঠিক থাকবে!
            placeholder: "-- বাজার সিলেক্ট করুন বা টাইপ করুন --"
        });
    }

    // পেমেন্ট স্ট্যাটাস চেক করা (URL থেকে)
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    if (paymentStatus === 'success') {
        Swal.fire('Premium Unlocked! 🎉', 'আপনার পেমেন্ট সফল হয়েছে। এখন আপনি সব প্রিমিয়াম ফিচার আনলিমিটেড ব্যবহার করতে পারবেন।', 'success');
        // রিফ্রেশ দিলে যেন আবার পপআপ না আসে তাই URL পরিষ্কার করে দেওয়া
        window.history.replaceState(null, '', window.location.pathname);
    } else if (paymentStatus === 'failed') {
        Swal.fire('Payment Failed!', 'পেমেন্ট সম্পন্ন হয়নি বা ক্যান্সেল করা হয়েছে। দয়া করে আবার চেষ্টা করুন।', 'error');
        window.history.replaceState(null, '', window.location.pathname);
    }
});


// গ্লোবাল ডেট ইনিশিয়ালাইজ করার ফাংশন
function initGlobalDates() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const offset = now.getTimezoneOffset() * 60000;
    globalStartDate = new Date(firstDay.getTime() - offset).toISOString().split('T')[0];
    globalEndDate = new Date(lastDay.getTime() - offset).toISOString().split('T')[0];

    const startInput = document.getElementById('global-start-date');
    const endInput = document.getElementById('global-end-date');

    if (startInput) startInput.value = globalStartDate;
    if (endInput) endInput.value = globalEndDate;

    updateDateRangeDisplay(); // UI আপডেট করবে
}

// ফিল্টার অ্যাপ্লাই করার ফাংশন
function applyGlobalFilter() {
    globalStartDate = document.getElementById('global-start-date').value;
    globalEndDate = document.getElementById('global-end-date').value;

    if (!globalStartDate || !globalEndDate) {
        alert("দয়া করে From এবং To তারিখ ঠিকমতো সিলেক্ট করুন।");
        return;
    }

    updateDateRangeDisplay(); // UI আপডেট করবে
    loadAllData(); // ডেটা রিলোড করবে
}

// UI তে সুন্দর করে তারিখ এবং সিস্টেম দেখানোর ফাংশন
function updateDateRangeDisplay() {
    const displaySpan = document.getElementById('display-date-range');
    if (displaySpan && globalStartDate && globalEndDate) {
        const startObj = new Date(globalStartDate);
        const endObj = new Date(globalEndDate);

        // তারিখগুলোকে "Feb 01" এবং "Feb 28, 2026" ফরম্যাটে সাজানো
        const startStr = startObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
        const endStr = endObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

        displaySpan.innerText = `(${startStr} - ${endStr})`;
    }

    // ম্যাজিক: ক্যালকুলেশন মোড (Average/Fixed) ব্যাজে আপডেট করা
    const modeTextEl = document.getElementById('calc-mode-text');
    const calcModeBadge = document.getElementById('display-calc-mode');
    
    if (modeTextEl && calcModeBadge) {
        const currentMode = localStorage.getItem('calcMode') || 'average';
        if (currentMode === 'fixed') {
            modeTextEl.innerText = 'Fixed Rate';
            calcModeBadge.className = 'badge bg-warning bg-opacity-10 text-dark border border-warning border-opacity-50';
        } else {
            modeTextEl.innerText = 'Average';
            calcModeBadge.className = 'badge bg-success bg-opacity-10 text-success border border-success border-opacity-25';
        }
    }
}

// ফিল্টার অ্যাপ্লাই করে ডাটাবেসে সেভ করা এবং ড্যাশবোর্ডে ফিরে যাওয়ার ফাংশন
window.applyGlobalFilterAndGoHome = async function() {
    globalStartDate = document.getElementById('global-start-date').value;
    globalEndDate = document.getElementById('global-end-date').value;

    if (!globalStartDate || !globalEndDate) {
        alert("দয়া করে From এবং To তারিখ ঠিকমতো সিলেক্ট করুন।");
        return;
    }

    // বাটনে লোডিং অ্যানিমেশন দেখানো
    const btn = document.querySelector('button[onclick="applyGlobalFilterAndGoHome()"]');
    const origText = btn.innerHTML;
    if(btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';
        btn.disabled = true;
    }

    try {
        // ম্যাজিক: সিলেক্ট করা তারিখ ডাটাবেসের গ্লোবাল সেটিংসে সেভ করে দেওয়া হচ্ছে!
        await fetch(`${API_BASE_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                periodStart: globalStartDate,
                periodEnd: globalEndDate
            })
        });

        updateDateRangeDisplay(); 
        await loadAllData(); 
        
        // সাকসেস মেসেজ দেখানো এবং ড্যাশবোর্ডে চলে যাওয়া
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        Toast.fire({ icon: 'success', title: 'Global Period Saved!' });

        const dashboardBtn = document.querySelector('.nav-btn[data-target="dashboard"]');
        if(dashboardBtn) dashboardBtn.click();

    } catch (error) {
        console.error("Error saving global dates:", error);
        Swal.fire('Error!', 'তারিখ সেভ করতে সমস্যা হয়েছে।', 'error');
    } finally {
        if(btn) {
            btn.innerHTML = origText;
            btn.disabled = false;
        }
    }
}


// --- NAVIGATION LOGIC (With Smart Tab Memory & Time Limit) ---
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    // ১. ম্যাজিক: কতক্ষণ আগে ট্যাব সেভ হয়েছিল তা চেক করা (এখানে ১ ঘণ্টা = 3600000 মিলি-সেকেন্ড দেওয়া হয়েছে)
    const savedTime = localStorage.getItem('tabSaveTime');
    const currentTime = new Date().getTime();
    let savedTarget = 'dashboard'; // ডিফল্টভাবে ড্যাশবোর্ড দেখাবে

    // যদি ১ ঘণ্টার কম সময় হয়ে থাকে, তবেই সেভ করা আগের ট্যাবটি ওপেন করবে
    if (savedTime && (currentTime - savedTime) < 1800000) { // ৩০ মিনিট = 1800000 মিলি-সেকেন্ড
        savedTarget = localStorage.getItem('activeTab') || 'dashboard';
    } else {
        // অনেক সময় পার হয়ে গেলে পুরনো মেমোরি ডিলিট করে দেবে
        localStorage.removeItem('activeTab');
        localStorage.removeItem('tabSaveTime');
    }

    navButtons.forEach(btn => {
        
        // ২. সেভ করা বা ডিফল্ট ট্যাব অনুযায়ী সঠিক পেজটি ওপেন রাখা
        if(btn.getAttribute('data-target') === savedTarget) {
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('d-none'));
            const targetEl = document.getElementById(savedTarget);
            if(targetEl) targetEl.classList.remove('d-none');
        }

        // ৩. ক্লিক করার সাথে সাথে নতুন ট্যাবটি এবং "বর্তমান সময়" সেভ করে ফেলা
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = btn.getAttribute('data-target');
            
            // ব্রাউজারে ক্লিক করা ট্যাবের নাম এবং সময় সেভ করে রাখা হচ্ছে
            localStorage.setItem('activeTab', target);
            localStorage.setItem('tabSaveTime', new Date().getTime()); // <-- নতুন লাইন

            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('d-none'));
            document.getElementById(target).classList.remove('d-none');
            
            // মোবাইলের মেনুবার ক্লিক করার পর অটোমেটিক বন্ধ করে দেওয়া
            const navbarCollapse = document.getElementById('navbarNav');
            if (navbarCollapse && navbarCollapse.classList.contains('show')) {
                new bootstrap.Collapse(navbarCollapse).hide();
            }
        });
    });
}

function setDefaultDates() {
    // বাংলাদেশ সময় অনুযায়ী আজকের একদম সঠিক তারিখ (Local Timezone) বের করা
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - offset).toISOString().split('T')[0];

    const mealDateInput = document.getElementById('meal-date');
    const bazarDateInput = document.querySelector('#form-add-bazar input[type="date"]');

    if (mealDateInput) mealDateInput.value = localDate;
    if (bazarDateInput) bazarDateInput.value = localDate;
}







// --- SUBMIT ACTIONS (POST/PUT/DELETE) ---

// 1. Edit Member Modal
function openEditMemberModal(btn, id, name, room, phone) {
    activeEditBtn = btn;
    document.getElementById('edit-member-id').value = id;
    document.getElementById('edit-member-name').value = name;
    document.getElementById('edit-member-room').value = room;
    document.getElementById('edit-member-phone').value = (phone && phone !== 'undefined') ? phone : ''; // নতুন লাইন
    new bootstrap.Modal(document.getElementById('editMemberModal')).show();
}

// Edit Member

document.getElementById('form-edit-member').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-member-id').value;
    const name = document.getElementById('edit-member-name').value;
    const room = document.getElementById('edit-member-room').value;
    const phone = document.getElementById('edit-member-phone').value; // নতুন লাইন

    // ১. সাথে সাথে বক্সটি বন্ধ করে দেওয়া
    bootstrap.Modal.getInstance(document.getElementById('editMemberModal')).hide();

    // ২. ব্যাকগ্রাউন্ডের পেন আইকনে স্পিনার ঘুরানো
    if (activeEditBtn) {
        activeEditBtn.innerHTML = '<span class="spinner-border spinner-border-sm text-primary"></span>';
        activeEditBtn.disabled = true;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/members/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, room, phone })
        });

        if (res.ok) {
            await loadAllData(); // ডেটা রিলোড হলে টেবিল নতুন করে তৈরি হবে এবং স্পিনার নিজে থেকেই গায়েব হয়ে যাবে
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Member Updated!' });
        } else {
            Swal.fire('Error!', 'আপডেট করতে সমস্যা হয়েছে।', 'error');
            if (activeEditBtn) { activeEditBtn.innerHTML = '<i class="bi bi-pencil"></i>'; activeEditBtn.disabled = false; }
        }
    } catch (error) {
        Swal.fire('Error!', 'নেটওয়ার্ক সমস্যা!', 'error');
        if (activeEditBtn) { activeEditBtn.innerHTML = '<i class="bi bi-pencil"></i>'; activeEditBtn.disabled = false; }
    }
});




document.getElementById('form-add-meal').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('meal-date').value;
    const mealType = e.target.querySelector('select').value;
    const members = Array.from(document.querySelectorAll('.meal-checkbox:checked')).map(cb => cb.value);

    // মেম্বার সিলেক্ট না করলে প্রফেশনাল ওয়ার্নিং
    if (members.length === 0) {
        Swal.fire('Oops!', 'আপনাকে অন্তত একজন মেম্বার সিলেক্ট করতে হবে।', 'warning');
        return;
    }

    // বাটন সিলেক্ট করা এবং লোডিং অ্যানিমেশন দেওয়া
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Saving...';
    submitBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/meals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, mealType, members })
        });

        if (res.ok) {
            e.target.reset();
            setDefaultDates();
            await loadAllData();
            // এখান থেকে বিরক্তিকর alert('Meal entry saved!'); লাইনটি সরিয়ে দেওয়া হয়েছে

            // ছোট্ট একটি নোটিফিকেশন (Toast) দেখাতে চাইলে নিচের লাইনটি রাখতে পারেন, নাহলে কেটে দিতে পারেন। 
            // এটি স্ক্রিনের কোণায় আসবে, ইউজারকে ডিস্টার্ব করবে না।
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Meal Saved!' });
        } else {
            Swal.fire('Error!', 'মিল সেভ করতে সমস্যা হয়েছে।', 'error');
        }
    } catch (error) {
        console.error("Error saving meal:", error);
        Swal.fire('Error!', 'ইন্টারনেট কানেকশন বা সার্ভারে সমস্যা আছে!', 'error');
    } finally {
        // ডেটা সেভ হওয়ার পর বাটন আবার আগের অবস্থায় ফিরিয়ে আনা
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});


// ==========================================
// --- ADD MEMBER & ADD BAZAR (WITH ANIMATION) ---
// ==========================================

// Add Member
document.getElementById('form-add-member').addEventListener('submit', async (e) => {
    e.preventDefault();

    // বাটন সিলেক্ট করা এবং লোডিং অ্যানিমেশন দেওয়া
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Saving...';
    submitBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: e.target[0].value, 
                room: e.target[1].value, 
                phone: document.getElementById('add-member-phone').value // নতুন লাইন
            })
        });

        if (res.ok) {
            e.target.reset();
            await loadAllData();

            // সাকসেস টোস্ট অ্যানিমেশন (কোনো পপআপ ছাড়া)
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Member Added!' });
        } else {
            Swal.fire('Error!', 'মেম্বার অ্যাড করতে সমস্যা হয়েছে।', 'error');
        }
    } catch (error) {
        console.error("Error adding member:", error);
        Swal.fire('Error!', 'ইন্টারনেট কানেকশন বা সার্ভারে সমস্যা আছে!', 'error');
    } finally {
        // কাজ শেষ হলে বাটন আগের অবস্থায় ফিরিয়ে আনা
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});

// Add Bazar
// ==========================================
// --- SMART BULK BAZAR LOGIC ---
// ==========================================

let pendingBazarItems = []; 
let currentShopperId = ''; // ম্যাজিক: এখন আমরা নাম নয়, মেম্বারের ID সেভ রাখবো
let currentShopperName = '';
let currentBazarDate = '';

// Step 1: Start Button Click
document.getElementById('btn-start-bazar')?.addEventListener('click', () => {
    const dateInput = document.getElementById('bazar-bulk-date').value;
    const memberSelect = document.getElementById('bazar-bulk-member');
    
    if(!dateInput || !memberSelect.value) {
        Swal.fire('Oops!', 'দয়া করে তারিখ এবং বাজারকারীর নাম সিলেক্ট করুন!', 'warning');
        return;
    }

    currentBazarDate = dateInput;
    currentShopperId = memberSelect.value; // ড্রপডাউন থেকে সরাসরি Object ID নেওয়া হলো
    currentShopperName = memberSelect.options[memberSelect.selectedIndex].text.split(' (')[0]; 

    document.getElementById('display-shopper-name').innerText = currentShopperName;
    
    document.getElementById('bazar-step-1').classList.add('d-none');
    document.getElementById('bazar-step-2').classList.remove('d-none');
});

// Step 2: Add Item to Temporary List
document.getElementById('form-add-temp-item')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const itemName = document.getElementById('temp-item-name').value;
    const amount = Number(document.getElementById('temp-item-amount').value);

    const isDuplicate = pendingBazarItems.some(entry => entry.item === itemName);
    if (isDuplicate) {
        Swal.fire('Oops!', `"${itemName}" লিস্টে আগে থেকেই অ্যাড করা আছে!`, 'warning');
        return; 
    }

    pendingBazarItems.push({ item: itemName, amount: amount });
    e.target.reset();
    
    const tomSelectEl = document.getElementById('temp-item-name');
    if (tomSelectEl && tomSelectEl.tomselect) tomSelectEl.tomselect.clear();

    renderPendingBazarTable();
});

// (টেবিল রেন্ডার, রিমুভ, ক্যানসেল করার ফাংশনগুলো আগের মতোই থাকবে)
// টেবিল রেন্ডার করা
function renderPendingBazarTable() {
    const tbody = document.getElementById('temp-bazar-list');
    const tfoot = document.getElementById('temp-bazar-footer');
    const saveBtn = document.getElementById('btn-save-bulk-bazar');
    
    tbody.innerHTML = '';
    let total = 0;

    if(pendingBazarItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-muted small py-3">No items added yet.</td></tr>`;
        tfoot.classList.add('d-none');
        saveBtn.disabled = true;
        return;
    }

    pendingBazarItems.forEach((entry, index) => {
        total += entry.amount;
        tbody.innerHTML += `
            <tr>
                <td class="text-start ps-3 fw-bold text-dark">${entry.item}</td>
                <td class="fw-bold">৳${entry.amount}</td>
                <td>
                    <button onclick="removeTempItem(${index})" class="btn btn-sm btn-outline-danger py-0 px-2" title="Remove"><i class="bi bi-x-lg"></i></button>
                </td>
            </tr>
        `;
    });

    document.getElementById('temp-bazar-total').innerText = total;
    tfoot.classList.remove('d-none');
    saveBtn.disabled = false;
}

window.removeTempItem = function(index) {
    pendingBazarItems.splice(index, 1);
    renderPendingBazarTable();
};

window.editBazarInfo = function() {
    document.getElementById('bazar-step-2').classList.add('d-none');
    document.getElementById('bazar-step-1').classList.remove('d-none');
};

window.resetBulkBazar = function() {
    pendingBazarItems = [];
    renderPendingBazarTable();
    document.getElementById('bazar-step-2').classList.add('d-none');
    document.getElementById('bazar-step-1').classList.remove('d-none');
};

// Step 3: Save All to Database (প্রফেশনাল ওয়ে)
document.getElementById('btn-save-bulk-bazar')?.addEventListener('click', async () => {
    if(pendingBazarItems.length === 0) return;

    const btn = document.getElementById('btn-save-bulk-bazar');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving to Server...';
    btn.disabled = true;

    try {
        for(const entry of pendingBazarItems) {
            await fetch(`${API_BASE_URL}/bazar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    date: currentBazarDate, 
                    item: entry.item, 
                    amount: entry.amount,
                    note: "", // ম্যাজিক: Note এখন একদম ফাঁকা থাকবে!
                    shopper: currentShopperId // সরাসরি মেম্বারের ID পাঠানো হচ্ছে
                })
            });
        }

        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        Toast.fire({ icon: 'success', title: 'Full Bazar List Saved!' });
        
        resetBulkBazar(); 
        await loadAllData(); 

    } catch (error) {
        console.error("Bulk Save Error:", error);
        Swal.fire('Error!', 'সার্ভারে সেভ করতে সমস্যা হয়েছে।', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// Add Deposit Submit
document.getElementById('form-add-deposit').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('deposit-date').value;
    const member = document.getElementById('deposit-member').value;
    const amount = Number(document.getElementById('deposit-amount').value);

    // সাবমিট বাটনটি সিলেক্ট করা এবং আগের লেখা সেভ করে রাখা
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    // বাটনে লোডিং স্পিনার দেখানো এবং বাটন ডিজেবল করা (যাতে ডাবল ক্লিক না হয়)
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Saving...';
    submitBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/deposits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, member, amount })
        });

        if (res.ok) {
            e.target.reset();
            setDefaultDates();
            await loadAllData();
            // এখান থেকে alert('Deposit saved!'); লাইনটি সরিয়ে দেওয়া হয়েছে
        } else {
            alert('❌ ডেপোজিট সেভ করতে সমস্যা হয়েছে!');
        }
    } catch (error) {
        console.error("Error saving deposit:", error);
        alert('ইন্টারনেট কানেকশন বা সার্ভারে সমস্যা আছে!');
    } finally {
        // ডেটা সেভ হওয়ার পর বাটন আবার আগের অবস্থায় ফিরিয়ে আনা
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});



// --- BAZAR EDIT & DELETE LOGIC ---

// 2. Edit Bazar Modal
function openEditBazarModal(btn, id, date, item, amount, note) {
    activeEditBtn = btn; // ম্যাজিক: ক্লিক করা বাটনটি সেভ করে রাখলাম
    document.getElementById('edit-bazar-id').value = id;
    document.getElementById('edit-bazar-date').value = date;
    document.getElementById('edit-bazar-item').value = item;
    document.getElementById('edit-bazar-amount').value = amount;
    document.getElementById('edit-bazar-note').value = (note !== 'undefined' && note !== 'null') ? note : '';
    new bootstrap.Modal(document.getElementById('editBazarModal')).show();
}

// Edit Bazar

const formEditBazar = document.getElementById('form-edit-bazar');
if (formEditBazar) {
    formEditBazar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-bazar-id').value;
        const date = document.getElementById('edit-bazar-date').value;
        const item = document.getElementById('edit-bazar-item').value;
        const amount = Number(document.getElementById('edit-bazar-amount').value);
        const note = document.getElementById('edit-bazar-note').value;

        // ১. সাথে সাথে বক্সটি বন্ধ করে দেওয়া
        bootstrap.Modal.getInstance(document.getElementById('editBazarModal')).hide();

        // ২. ব্যাকগ্রাউন্ডের পেন আইকনে স্পিনার ঘুরানো
        if (activeEditBtn) {
            activeEditBtn.innerHTML = '<span class="spinner-border spinner-border-sm text-primary"></span>';
            activeEditBtn.disabled = true;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/bazar/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, item, amount, note })
            });

            if (res.ok) {
                await loadAllData();
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                Toast.fire({ icon: 'success', title: 'Bazar Updated!' });
            } else {
                Swal.fire('Error!', 'Failed to update.', 'error');
                if (activeEditBtn) { activeEditBtn.innerHTML = '<i class="bi bi-pencil"></i>'; activeEditBtn.disabled = false; }
            }
        } catch (error) {
            Swal.fire('Error!', 'Network issue!', 'error');
            if (activeEditBtn) { activeEditBtn.innerHTML = '<i class="bi bi-pencil"></i>'; activeEditBtn.disabled = false; }
        }
    });
}

// --- PDF DOWNLOAD LOGIC ---
function downloadReportPDF() {
    // এটি ব্রাউজারের নিজস্ব এবং পাওয়ারফুল প্রিন্ট/পিডিএফ ইঞ্জিন চালু করবে
    window.print();
}

// --- DOWNLOAD TODAY'S MEALS AS PHOTO LOGIC (FIXED FOR MOBILE) ---
function downloadTodaysMealsPhoto() {
    const container = document.getElementById('today-meals-container');

    if (!container || container.innerHTML.includes('No meals added')) {
        alert("No meals available to download!");
        return;
    }

    // ডাউনলোড শুরু হওয়ার সময় বাটনের টেক্সট পরিবর্তন করা
    const btn = document.querySelector('button[onclick="downloadTodaysMealsPhoto()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving...';
    btn.disabled = true;

    // ডিলিট বাটন (ডাস্টবিন আইকন) হাইড করা
    const deleteButtons = container.querySelectorAll('.btn');
    deleteButtons.forEach(btn => btn.style.display = 'none');

    // --- নতুন ফিক্স: মোবাইলের জন্য ফুল সাইজ ওপেন করা ---
    const tableResponsive = container.querySelector('.table-responsive');
    let originalOverflow = '';
    if (tableResponsive) {
        originalOverflow = tableResponsive.style.overflow;
        tableResponsive.style.overflow = 'visible'; // স্ক্রলবার সরিয়ে পুরো টেবিল দৃশ্যমান করা
    }

    // html-to-image ব্যবহার করে পুরো কন্টেইনারটিকে ছবিতে রূপান্তর
    htmlToImage.toJpeg(container, {
        quality: 0.98,
        backgroundColor: '#ffffff',
        // স্ক্রিনের সাইজের বদলে টেবিলের আসল (পুরো) লম্বাই-চওড়াই বলে দেওয়া
        width: container.scrollWidth,
        height: container.scrollHeight,
        style: {
            transform: 'none',
        }
    })
        .then(function (dataUrl) {
            // ছবির নাম তৈরি করা
            const niceDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
            const fileName = `Todays_Meals_${niceDate}.jpg`;

            // ছবি ডাউনলোড করা
            const link = document.createElement('a');
            link.download = fileName;
            link.href = dataUrl;
            link.click();

            // কাজ শেষে টেবিল এবং বাটন আবার আগের অবস্থায় ফিরিয়ে আনা
            deleteButtons.forEach(btn => btn.style.display = '');
            btn.innerHTML = originalText;
            btn.disabled = false;
            if (tableResponsive) tableResponsive.style.overflow = originalOverflow;
        })
        .catch(function (error) {
            console.error('Error generating image!', error);
            alert("Failed to save photo. Please try again.");

            // এরর হলেও যেন অ্যাপ আটকে না যায়, তাই সবকিছু আগের অবস্থায় ফেরানো
            deleteButtons.forEach(btn => btn.style.display = '');
            btn.innerHTML = originalText;
            btn.disabled = false;
            if (tableResponsive) tableResponsive.style.overflow = originalOverflow;
        });
}


// --- MEAL EDIT LOGIC ---

// এডিট পপ-আপ ওপেন করা এবং আগের ডেটা বসানো
// 3. Edit Meal Modal
function openEditMealModal(btn, mealId) {
    activeEditBtn = btn; // ম্যাজিক: ক্লিক করা বাটনটি সেভ করে রাখলাম
    const meal = state.meals.find(m => m._id === mealId);
    if (!meal) return;

    document.getElementById('edit-meal-id').value = meal._id;
    document.getElementById('edit-meal-date').value = meal.date.split('T')[0];
    document.getElementById('edit-meal-type').value = meal.mealType;

    const memberListDiv = document.getElementById('edit-meal-member-list');
    memberListDiv.innerHTML = '';

    const activeMembers = state.members
        .filter(m => m.isActive)
        .sort((a, b) => String(a.room).localeCompare(String(b.room), undefined, { numeric: true }));

    const mealMemberIds = meal.members.map(m => m._id || m);

    activeMembers.forEach(member => {
        const isChecked = mealMemberIds.includes(member._id) ? 'checked' : '';
        memberListDiv.innerHTML += `
            <div class="form-check mb-2 border-bottom pb-1">
                <input class="form-check-input edit-meal-member-checkbox border-secondary" type="checkbox" value="${member._id}" id="edit-member-${member._id}" ${isChecked}>
                <label class="form-check-label ms-2 fw-bold text-dark" for="edit-member-${member._id}">
                    ${member.name} <span class="text-muted small fw-normal">(Room: ${member.room})</span>
                </label>
            </div>
        `;
    });

    new bootstrap.Modal(document.getElementById('editMealModal')).show();
}

// আপডেট করা মিল সেভ করা

async function saveEditedMeal(event) {
    event.preventDefault();

    const id = document.getElementById('edit-meal-id').value;
    const date = document.getElementById('edit-meal-date').value;
    const mealType = document.getElementById('edit-meal-type').value;

    const checkboxes = document.querySelectorAll('.edit-meal-member-checkbox:checked');
    const members = Array.from(checkboxes).map(cb => cb.value);

    if (members.length === 0) {
        Swal.fire('Oops!', 'আপডেট করার জন্য অন্তত একজন মেম্বার সিলেক্ট করতে হবে!', 'warning');
        return;
    }

    // ১. সাথে সাথে বক্সটি বন্ধ করে দেওয়া
    bootstrap.Modal.getInstance(document.getElementById('editMealModal')).hide();

    // ২. ব্যাকগ্রাউন্ডের পেন আইকনে স্পিনার ঘুরানো
    if (activeEditBtn) {
        activeEditBtn.innerHTML = '<span class="spinner-border spinner-border-sm text-primary"></span>';
        activeEditBtn.disabled = true;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/meals/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, mealType, members, totalMeals: members.length })
        });

        if (response.ok) {
            await loadAllData();
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Meal Updated!' });
        } else {
            Swal.fire('Error!', 'আপডেট করতে সমস্যা হয়েছে।', 'error');
            if (activeEditBtn) { activeEditBtn.innerHTML = '<i class="bi bi-pencil"></i>'; activeEditBtn.disabled = false; }
        }
    } catch (error) {
        console.error("Error updating meal:", error);
        Swal.fire('Error!', 'নেটওয়ার্ক সমস্যা! দয়া করে আবার চেষ্টা করুন।', 'error');
        if (activeEditBtn) { activeEditBtn.innerHTML = '<i class="bi bi-pencil"></i>'; activeEditBtn.disabled = false; }
    }
}



// --- COPY LOW BALANCE NAMES LOGIC ---
function copyLowBalanceNames() {
    const thresholdInput = document.getElementById('low-balance-threshold');
    const threshold = Number(thresholdInput.value) || 0;

    if (!state.report || !state.report.members || state.report.members.length === 0) {
        alert("কপি করার মতো কোনো ডেটা নেই!");
        return;
    }

    // এখানেও শর্তটি আপডেট করা হলো (balance !== 0)
    const lowBalanceMembers = state.report.members.filter(m =>
        m.balance <= threshold && m.balance !== 0 && !m.isManager
    );

    if (lowBalanceMembers.length === 0) {
        alert("লিস্টে কপি করার মতো কোনো মেম্বার নেই!");
        return;
    }

    lowBalanceMembers.sort((a, b) => a.balance - b.balance);

    let copyText = `⚠️ Low Balance Alert (Below ৳${threshold}):\n\n`;

    lowBalanceMembers.forEach((member, index) => {
        const balanceText = member.balance < 0 ? `(Due: ৳${Math.abs(member.balance).toFixed(2)})` : `(Balance: ৳${member.balance.toFixed(2)})`;
        copyText += `${index + 1}. ${member.name} - Room: ${member.room} ${balanceText}\n`;
    });

    copyText += `\nদয়া করে দ্রুত মেসে টাকা জমা দিন।`;

    navigator.clipboard.writeText(copyText).then(() => {
        const copyBtn = document.querySelector('button[onclick="copyLowBalanceNames()"]');
        const originalHTML = copyBtn.innerHTML;

        copyBtn.innerHTML = '<i class="bi bi-check2-all"></i> Copied!';
        copyBtn.classList.replace('btn-danger', 'btn-success');

        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.classList.replace('btn-success', 'btn-danger');
        }, 2000);

    }).catch(err => {
        console.error("Copy failed", err);
        alert("কপি করতে সমস্যা হয়েছে। আপনার ব্রাউজার হয়তো এটি সাপোর্ট করছে কানা।");
    });
}


// --- DOWNLOAD LOW BALANCE AS IMAGE LOGIC ---
function downloadLowBalanceImage() {
    if (typeof html2canvas === 'undefined') {
        alert("ইমেজ লাইব্রেরি লোড হচ্ছে... অনুগ্রহ করে ২-৩ সেকেন্ড পর আবার চেষ্টা করুন।");
        return;
    }

    const card = document.getElementById('low-balance-card');
    const actionBox = document.getElementById('low-balance-actions');

    if (!card) return;

    // ১. ছবি তোলার আগে বাটন ও ইনপুট বক্স হাইড করে দেওয়া
    if (actionBox) actionBox.style.display = 'none';

    // ২. কার্ডের HD স্ক্রিনশট নেওয়া (scale: 2)
    html2canvas(card, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true
    }).then(canvas => {
        // ৩. ছবি তোলা শেষ হলে বাটনগুলো আবার ফিরিয়ে আনা
        if (actionBox) actionBox.style.display = 'flex';

        // ৪. ছবি ডাউনলোড করানো
        const link = document.createElement('a');
        const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
        link.download = `Low_Balance_Alert_${today}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(err => {
        // কোনো এরর হলেও যেন বাটনগুলো গায়েব না থাকে
        if (actionBox) actionBox.style.display = 'flex';
        console.error("Image generation failed:", err);
        alert("ছবি ডাউনলোড করতে সমস্যা হয়েছে।");
    });
}


// ==========================================
// --- REFUND MONEY LOGIC (AUTO MINUS) ---
// ==========================================

// মেম্বার লিস্ট আপডেট করার ফাংশন
const originalRenderDepositSelect = typeof renderDepositSelect === 'function' ? renderDepositSelect : function () { };
renderDepositSelect = function () {
    originalRenderDepositSelect(); // আগের ফাংশনটি কল করা হলো
    const refundSelect = document.getElementById('refund-member');
    if (refundSelect && state.members) {
        let options = '<option value="" disabled selected>-- মেম্বার সিলেক্ট করুন --</option>';
        state.members.filter(m => m.isActive).forEach(m => {
            options += `<option value="${m._id}">${m.name} (${m.room})</option>`;
        });
        refundSelect.innerHTML = options;
    }
};

// রিফান্ড ফর্ম সাবমিট করার লজিক
document.addEventListener("DOMContentLoaded", () => {
    const refundForm = document.getElementById('form-refund-money');
    if (refundForm) {
        // আজকের তারিখ ডিফল্টভাবে বসানো
        const today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(today.getTime() - offset)).toISOString().split('T')[0];
        const dateInput = document.getElementById('refund-date');
        if (dateInput) dateInput.value = localISOTime;

        refundForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('refund-date').value;
            const memberId = document.getElementById('refund-member').value;
            const amountVal = document.getElementById('refund-amount').value;

            // ম্যাজিক: পজিটিভ নাম্বারকে অটোমেটিক মাইনাস (-) করে দেওয়া
            const autoMinusAmount = -Math.abs(Number(amountVal));

            // সাবমিট বাটনে লোডিং দেখানো
            const submitBtn = refundForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Processing...';
            submitBtn.disabled = true;

            try {
                const res = await fetch('https://meal-manager-backend-kp8y.onrender.com/api/deposits', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date, member: memberId, amount: autoMinusAmount }) // মাইনাস ডেটা পাঠানো হলো
                });

                if (res.ok) {
                    // এখান থেকে alert মেসেজটি পুরোপুরি সরিয়ে দেওয়া হয়েছে
                    refundForm.reset();
                    if (dateInput) dateInput.value = localISOTime;
                    await loadAllData(); // ডেটা রিলোড করে ব্যালেন্স আপডেট করা
                } else {
                    const err = await res.json();
                    alert(`❌ সমস্যা হয়েছে: ${err.message || 'Refund failed'}`);
                }
            } catch (error) {
                console.error(error);
                alert('ইন্টারনেট কানেকশন বা সার্ভারে সমস্যা আছে!');
            } finally {
                // কাজ শেষ হলে বাটন আগের অবস্থায় ফিরে আসবে
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }
});


// ==========================================
// --- PROFESSIONAL POPUPS (SWEETALERT2) ---
// ==========================================



// Delete Member
function deleteMember(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: "This member will be deleted permanently!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete!',
        showLoaderOnConfirm: true, // বাটনে লোডিং অ্যানিমেশন চালু করবে
        preConfirm: async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/members/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Server Error');
                await loadAllData();
                return true;
            } catch (error) {
                Swal.showValidationMessage('সার্ভারে সমস্যা হয়েছে!');
            }
        },
        allowOutsideClick: () => !Swal.isLoading() // লোডিং চলাকালীন বাইরে ক্লিক করলে পপআপ কাটবে না
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Deleted!', text: 'Member has been deleted.', icon: 'success', timer: 1500, showConfirmButton: false });
        }
    });
}


// ==========================================
// --- EDIT OR ADD SHOPPER NAME FOR FULL DAY ---
// ==========================================
// ==========================================
// --- EDIT OR ADD SHOPPER NAME FOR FULL DAY ---
// ==========================================
window.editShopperForDate = async function(dateStr, currentShopperId) {
    const activeMembers = state.members
        .filter(m => m.isActive)
        .sort((a, b) => String(a.room).localeCompare(String(b.room), undefined, { numeric: true }));
    
    const inputOptions = {};
    activeMembers.forEach(m => {
        inputOptions[m._id] = `${m.name} (Room: ${m.room})`; // নাম নয়, ID সেভ হবে
    });

    const { value: selectedShopperId } = await Swal.fire({
        title: currentShopperId ? 'Edit Shopper' : 'Add Shopper',
        text: `বাজারের তারিখ: ${new Date(dateStr).toLocaleDateString('en-GB')}`,
        icon: 'question',
        input: 'select',
        inputOptions: inputOptions,
        inputValue: currentShopperId,
        inputPlaceholder: '-- মেম্বার সিলেক্ট করুন --',
        showCancelButton: true,
        confirmButtonColor: '#0d6efd',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="bi bi-check-circle"></i> Save Name',
        inputValidator: (value) => {
            if (!value) return 'দয়া করে একজন মেম্বার সিলেক্ট করুন!';
        }
    });

    if (selectedShopperId && selectedShopperId !== currentShopperId) {
        Swal.fire({ title: 'Saving...', html: 'পুরো দিনের ডেটা আপডেট হচ্ছে, দয়া করে অপেক্ষা করুন।', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

        try {
            const daysItems = state.bazar.filter(b => b.date.startsWith(dateStr));
            
            for (const item of daysItems) {
                await fetch(`${API_BASE_URL}/bazar/${item._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        date: item.date, 
                        item: item.item, 
                        amount: item.amount, 
                        note: item.note, // আগের রিয়েল নোট থাকলে সেটা অক্ষত থাকবে
                        shopper: selectedShopperId // প্রফেশনাল মেম্বার ID বসবে
                    })
                });
            }
            
            await loadAllData();
            Swal.fire({ icon: 'success', title: 'Success!', text: 'বাজারকারীর নাম সফলভাবে আপডেট হয়েছে।', timer: 1500, showConfirmButton: false });
        } catch (error) {
            console.error("Shopper Update Error:", error);
            Swal.fire('Error!', 'সার্ভারে আপডেট করতে সমস্যা হয়েছে।', 'error');
        }
    }
};


// ==========================================
// --- SHOW SHOPPER DATES POPUP ---
// ==========================================
window.showShopperDates = function(name, datesJsonStr) {
    const datesArray = JSON.parse(decodeURIComponent(datesJsonStr));
    
    // তারিখগুলোকে সুন্দর করে লিস্ট আকারে সাজানো
    let listHTML = '<div class="list-group text-start mt-3 shadow-sm">';
    datesArray.forEach((dateStr, index) => {
        const dateObj = new Date(dateStr);
        const niceDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'long' });
        
        listHTML += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <span class="fw-bold text-dark"><span class="text-primary me-2">${index + 1}.</span>${niceDate}</span>
                <span class="badge bg-light border text-secondary">${dayName}</span>
            </div>
        `;
    });
    listHTML += '</div>';

    // SweetAlert2 দিয়ে প্রফেশনাল পপআপ দেখানো
    Swal.fire({
        title: `<i class="bi bi-calendar-check text-primary"></i> ${name}`,
        html: `<div class="text-muted small mb-2">এই মাসে মোট <strong>${datesArray.length}</strong> দিন বাজার করেছেন:</div>` + listHTML,
        confirmButtonColor: '#0d6efd',
        confirmButtonText: 'Close',
        customClass: { popup: 'rounded-4' }
    });
};


// ==========================================
// --- MEAL SETTINGS LOGIC (DATABASE SYNC) ---
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Settings সেভ করা (সরাসরি ডাটাবেসে)
    const settingsForm = document.getElementById('form-meal-settings');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // বাটন লোডিং
            const btn = settingsForm.querySelector('button[type="submit"]');
            const origText = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
            btn.disabled = true;

            const newSettings = {
                calcMode: document.getElementById('setting-calc-mode').value,
                rateBreakfast: document.getElementById('rate-breakfast').value,
                rateLunch: document.getElementById('rate-lunch').value,
                rateDinner: document.getElementById('rate-dinner').value,
                rateSehri: document.getElementById('rate-sehri').value,
                rateIftar: document.getElementById('rate-iftar').value
            };

            try {
                // ডাটাবেসে সেভ করার রিকোয়েস্ট
                const res = await fetch(`${API_BASE_URL}/settings`, {
                    method: 'POST', // অথবা PUT (আপনার রাউট অনুযায়ী)
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newSettings)
                });

                if (res.ok) {
                    Swal.fire({ icon: 'success', title: 'Global Settings Saved!', text: 'হিসাবের নতুন নিয়ম সব ডিভাইসের জন্য কার্যকর হয়েছে।', timer: 2000, showConfirmButton: false });
                    await loadAllData(); 
                } else {
                    Swal.fire('Error!', 'সেটিংস সেভ করতে সমস্যা হয়েছে।', 'error');
                }
            } catch (error) {
                Swal.fire('Error!', 'সার্ভারে কানেক্ট করা যাচ্ছে না।', 'error');
            } finally {
                btn.innerHTML = origText;
                btn.disabled = false;
            }
        });
    }
});


// Change Period বাটনে ক্লিক করলে Settings আসা-যাওয়ার (Toggle) বুলেটপ্রুফ লজিক
window.toggleSettingsView = function() {
    const settingsSection = document.getElementById('settings');
    const dashboardSection = document.getElementById('dashboard');

    if (!settingsSection || !dashboardSection) {
        console.error("Settings or Dashboard section not found in HTML!");
        return;
    }

    // যদি Settings হাইড করা থাকে (অর্থাৎ বন্ধ থাকে)
    if (settingsSection.classList.contains('d-none')) {
        // স্ক্রিনের সব সেকশন হাইড করে দাও
        document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('d-none'));
        // শুধু Settings টা ওপেন করো
        settingsSection.classList.remove('d-none');
        
        // (ঐচ্ছিক) মেনুবারে Settings এর রঙ অ্যাক্টিভ করা
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const settingsBtn = document.querySelector('.nav-btn[data-target="settings"]');
        if (settingsBtn) settingsBtn.classList.add('active');
        
    } else {
        // যদি Settings আগে থেকেই ওপেন থাকে, তাহলে সব হাইড করে ড্যাশবোর্ডে ফিরে যাও
        document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('d-none'));
        dashboardSection.classList.remove('d-none');
        
        // (ঐচ্ছিক) মেনুবারে Dashboard এর রঙ অ্যাক্টিভ করা
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const dashboardBtn = document.querySelector('.nav-btn[data-target="dashboard"]');
        if (dashboardBtn) dashboardBtn.classList.add('active');
    }
};


// ==========================================
// --- WHATSAPP AUTO NOTIFICATION ---
// ==========================================
window.sendWhatsAppMsg = function(phone, name, balance) {
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '88' + formattedPhone;
    } else if (!formattedPhone.startsWith('88')) {
        formattedPhone = '880' + formattedPhone; 
    }
    
    let message = '';
    const exactAmount = Math.abs(balance).toFixed(2);

    // ম্যাজিক: ব্যালেন্স মাইনাস নাকি প্লাস, তার ওপর ভিত্তি করে আলাদা মেসেজ!
    if (balance < 0) {
        // বকেয়া (Due) থাকলে এই মেসেজ যাবে
        message = `আসসালামু আলাইকুম ${name},\nমেস অ্যাকাউন্টে আপনার ৳${exactAmount} টাকা বকেয়া (Due) হয়েছে। দয়া করে দ্রুত টাকা জমা দিন।\n- মেস ম্যানেজার`;
    } else {
        // ব্যালেন্স প্লাস কিন্তু কম (Low Balance) থাকলে এই মেসেজ যাবে
        message = `আসসালামু আলাইকুম ${name},\nমেস অ্যাকাউন্টে আপনার ব্যালেন্স খুবই কম (মাত্র ৳${exactAmount} বাকি আছে)। মিল চালু রাখতে দয়া করে দ্রুত টাকা জমা দিন।\n- মেস ম্যানেজার`;
    }
    
    // হোয়াটসঅ্যাপ ওপেন করা
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
}


// ==========================================
// --- MEMBER HISTORY (PASSBOOK) LOGIC ---
// ==========================================
window.showMemberHistory = function(memberId) {
    const memberIdStr = memberId.toString();
    const memberInfo = state.report?.members?.find(m => m.memberId.toString() === memberIdStr);
    
    if (!memberInfo) {
        Swal.fire('Oops!', 'ডেটা লোড হয়নি। দয়া করে একটু পর আবার চেষ্টা করুন।', 'warning');
        return;
    }

    // ১. নাম এবং ব্যালেন্স সেট করা
    document.getElementById('history-member-name').innerText = memberInfo.name;
    const balEl = document.getElementById('history-current-balance');
    balEl.innerText = memberInfo.balance < 0 ? `Due: ৳${Math.abs(memberInfo.balance).toFixed(2)}` : `Adv: ৳${memberInfo.balance.toFixed(2)}`;
    balEl.className = memberInfo.balance < 0 ? 'mb-0 text-danger' : 'mb-0 text-success';

    const transactions = [];

    // ২. জমার হিসাব (Deposits & Refunds)
    const memberDeposits = state.deposits.filter(d => {
        const dId = typeof d.member === 'object' ? d.member._id : d.member;
        return dId.toString() === memberIdStr;
    });

    memberDeposits.forEach(d => {
        transactions.push({
            date: new Date(d.date),
            details: d.amount < 0 ? '<span class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">Refund / Minus</span>' : '<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">Cash In</span>',
            amount: d.amount
        });
    });

    // ৩. খরচের হিসাব (Meals)
    const calcMode = state.report.calcMode || 'average';
    const avgRate = state.report.mealRate || 0;
    const s = state.settings || {};
    const fixedRates = {
        breakfast: Number(s.rateBreakfast) || 0, lunch: Number(s.rateLunch) || 0,
        dinner: Number(s.rateDinner) || 0, sehri: Number(s.rateSehri) || 0, iftar: Number(s.rateIftar) || 0
    };

    const memberMeals = state.meals.filter(m => 
        m.members.some(mem => (mem._id || mem).toString() === memberIdStr)
    );

    memberMeals.forEach(m => {
        let cost = 0;
        if (!memberInfo.isManager) {
            if (calcMode === 'fixed') {
                const mType = (m.mealType || '').trim().toLowerCase();
                cost = fixedRates[mType] || 0;
            } else {
                cost = avgRate;
            }
        }
        
        transactions.push({
            date: new Date(m.date),
            details: `<span class="badge bg-primary bg-opacity-10 text-primary text-capitalize border border-primary border-opacity-25">${m.mealType} Meal</span>`,
            amount: -cost // খরচ তাই মাইনাস
        });
    });

    // ৪. তারিখ অনুযায়ী সাজানো (নতুনটা আগে)
    transactions.sort((a, b) => b.date - a.date);

    // ৫. টেবিলে ডেটা বসানো
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';

    if (transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4">এই তারিখে কোনো লেনদেন নেই।</td></tr>`;
    } else {
        transactions.forEach(t => {
            const dateStr = t.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            const amountColor = t.amount < 0 ? 'text-danger' : 'text-success';
            const amountSign = t.amount > 0 ? '+' : '';
            const amountText = t.amount === 0 ? 'Free' : `${amountSign}৳${Math.abs(t.amount).toFixed(2)}`;

            tbody.innerHTML += `
                <tr>
                    <td class="align-middle fw-bold text-muted ps-3" style="white-space: nowrap;">${dateStr}</td>
                    <td class="align-middle">${t.details}</td>
                    <td class="align-middle text-end fw-bold pe-3 ${amountColor}">${amountText}</td>
                </tr>
            `;
        });
    }

    // মোডাল ওপেন করা
    new bootstrap.Modal(document.getElementById('memberHistoryModal')).show();
};


// ==========================================
// --- DESIGNED EXCEL EXPORT LOGIC ---
// ==========================================
window.exportReportToExcel = function() {
    if (!state.report || !state.report.members || state.report.members.length === 0) {
        Swal.fire('Oops!', 'এক্সেল ডাউনলোড করার জন্য কোনো ডেটা নেই!', 'warning');
        return;
    }

    // ১. এক্সেলের জন্য প্রফেশনাল ডিজাইন (CSS) সহ HTML টেবিল তৈরি
    let tableHTML = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
        <meta charset="utf-8">
        <style>
            table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
            th { background-color: #0d6efd; color: #ffffff; font-weight: bold; padding: 10px; border: 1px solid #dddddd; text-align: center; }
            td { padding: 8px; border: 1px solid #dddddd; text-align: center; vertical-align: middle; }
            .text-start { text-align: left; }
            .due { color: #dc3545; font-weight: bold; background-color: #f8d7da; }
            .adv { color: #198754; font-weight: bold; background-color: #d1e7dd; }
            .manager { color: #856404; font-size: 11px; font-weight: bold; }
        </style>
    </head>
    <body>
        <h2 style="text-align: center; color: #333; font-family: Arial, sans-serif;">Mess Monthly Report</h2>
        <table>
            <thead>
                <tr>
                    <th style="width: 150px;">MEMBER NAME</th>
                    <th style="width: 80px;">ROOM</th>
                    <th style="width: 100px;">TOTAL MEALS</th>
                    <th style="width: 100px;">MEAL COST</th>
                    <th style="width: 100px;">DEPOSITED</th>
                    <th style="width: 120px;">FINAL BALANCE</th>
                    <th style="width: 100px;">STATUS</th>
                </tr>
            </thead>
            <tbody>
    `;

    const activeReportMembers = state.report.members.filter(member => member.totalMeals > 0 || member.depositedAmount > 0);

    // ২. মেম্বারদের ডেটা টেবিলে বসানো এবং লজিক অনুযায়ী রঙ দেওয়া
    activeReportMembers.forEach(member => {
        const isDue = member.balance < 0;
        const statusClass = isDue ? 'due' : 'adv';
        const statusText = isDue ? 'Due' : 'Advance';
        const managerText = member.isManager ? '<br><span class="manager">(Manager)</span>' : '';

        tableHTML += `
            <tr>
                <td class="text-start"><b>${member.name}</b>${managerText}</td>
                <td>${member.room}</td>
                <td>${member.totalMeals}</td>
                <td>৳${member.payableAmount.toFixed(2)}</td>
                <td>৳${member.depositedAmount.toFixed(2)}</td>
                <td class="${statusClass}">৳${Math.abs(member.balance).toFixed(2)}</td>
                <td class="${statusClass}">${statusText}</td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    </body>
    </html>
    `;

    // ৩. HTML কে সরাসরি .xls (Excel) ফাইলে রূপান্তর করে ডাউনলোড করানো
    const blob = new Blob(['\ufeff' + tableHTML], { type: 'application/vnd.ms-excel' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const niceDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Mess_Report_${niceDate}.xls`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ==========================================
// --- CLOSE TERM & HANDOVER (SAAS LOGIC) ---
// ==========================================
window.triggerHandover = async function() {
    if (!state.report || !state.report.members || state.report.members.length === 0) {
        Swal.fire('Oops!', 'হিসাব ক্লোজ করার মতো কোনো ডেটা নেই!', 'warning');
        return;
    }

    // ১. নতুন ম্যানেজার সিলেক্ট করার জন্য অপশন তৈরি
    const activeMembers = state.members
        .filter(m => m.isActive)
        .sort((a, b) => String(a.room).localeCompare(String(b.room), undefined, { numeric: true }));
        
    let optionsHTML = '<option value="" disabled selected>-- নতুন ম্যানেজার সিলেক্ট করুন --</option>';
    activeMembers.forEach(m => {
        optionsHTML += `<option value="${m._id}">${m.name} (Room: ${m.room})</option>`;
    });

    // ২. প্রফেশনাল SweetAlert পপআপ (SaaS স্টাইল)
    const { value: formValues } = await Swal.fire({
        title: '<i class="bi bi-exclamation-triangle-fill text-warning fs-1 d-block mb-2"></i> Close Term?',
        html: `
            <p class="text-muted small mb-4">বর্তমান মেয়াদের সব হিসাব ক্লোজ হয়ে যাবে এবং বকেয়া (Due) ও পাওনা (Advance) টাকাগুলো ঠিক পরের মেয়াদে <strong>Previous Balance</strong> হিসেবে অটোমেটিক ট্রান্সফার হয়ে যাবে।</p>
            <div class="text-start bg-light p-3 rounded border">
                <label class="fw-bold small mb-2 text-dark">পরের মেয়াদের জন্য নতুন ম্যানেজার কে হবেন?</label>
                <select id="next-manager-select" class="form-select border-primary fw-bold text-primary">
                    ${optionsHTML}
                </select>
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#0d6efd',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, Close & Transfer <i class="bi bi-arrow-right-circle ms-1"></i>',
        preConfirm: () => {
            const newManagerId = document.getElementById('next-manager-select').value;
            if (!newManagerId) {
                Swal.showValidationMessage('আপনাকে অবশ্যই একজন নতুন ম্যানেজার সিলেক্ট করতে হবে!');
                return false;
            }
            return newManagerId;
        }
    });

    if (formValues) {
        const newManagerId = formValues;

        // লোডিং অ্যানিমেশন চালু
        Swal.fire({ 
            title: 'Processing Handover...', 
            html: 'সবার ব্যালেন্স ট্রান্সফার করা হচ্ছে, দয়া করে অপেক্ষা করুন।<br><br><span class="spinner-border text-primary"></span>', 
            allowOutsideClick: false, 
            showConfirmButton: false 
        });

        try {
            // ৩. ট্রান্সফারের তারিখ নির্ধারণ (বর্তমান মেয়াদের End Date এর ঠিক পরের দিন)
            const endDateObj = new Date(globalEndDate);
            endDateObj.setDate(endDateObj.getDate() + 1);
            const nextDayStr = endDateObj.toISOString().split('T')[0];

            // ৪. সবার ব্যালেন্স ট্রান্সফার করা (Looping through all members)
            const transferPromises = [];
            state.report.members.forEach(member => {
                const balance = member.balance;
                if (balance !== 0 && !member.isManager) {
                    // ব্যালেন্স যদি মাইনাস (Due) হয়, তবে অটোমেটিক রিফান্ড বা নেগেটিভ ডেপোজিট হিসেবে যাবে
                    transferPromises.push(
                        fetch(`${API_BASE_URL}/deposits`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                date: nextDayStr, 
                                member: member.memberId || member._id, 
                                amount: balance 
                            })
                        })
                    );
                }
            });

            // সব API কল একসাথে ফায়ার করা (যাতে সময় কম লাগে)
            await Promise.all(transferPromises);

            // ৫. নতুন ম্যানেজার ডাটাবেসে সেট করা
            const newYear = endDateObj.getFullYear();
            const newMonth = endDateObj.getMonth() + 1;
            
            await fetch(`${API_BASE_URL}/manager`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ member: newManagerId, year: newYear, month: newMonth })
            });

            // ৬. গ্লোবাল সেটিংস (Report Period) আপডেট করে নতুন মেয়াদে নিয়ে যাওয়া
            const endOfNewMonthObj = new Date(newYear, newMonth, 0); // ওই মাসের শেষ দিন
            const endOfNewMonthStr = endOfNewMonthObj.toISOString().split('T')[0];
            
            await fetch(`${API_BASE_URL}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    periodStart: nextDayStr,
                    periodEnd: endOfNewMonthStr
                })
            });

            // লোকাল ভেরিয়েবল এবং ইনপুট ফিল্ড আপডেট
            globalStartDate = nextDayStr;
            globalEndDate = endOfNewMonthStr;
            
            const startInput = document.getElementById('global-start-date');
            const endInput = document.getElementById('global-end-date');
            if(startInput) startInput.value = globalStartDate;
            if(endInput) endInput.value = globalEndDate;

            // ডেটা রিলোড করা
            await loadAllData();
            
            // ৭. সাকসেস মেসেজ এবং ড্যাশবোর্ডে রিডাইরেক্ট
            Swal.fire({
                icon: 'success',
                title: 'Handover Successful!',
                text: 'হিসাব সফলভাবে ক্লোজ হয়েছে এবং নতুন মেয়াদের ড্যাশবোর্ড রেডি!',
                confirmButtonColor: '#198754'
            }).then(() => {
                const dashboardBtn = document.querySelector('.nav-btn[data-target="dashboard"]');
                if(dashboardBtn) dashboardBtn.click();
            });

        } catch (error) {
            console.error("Handover Error:", error);
            Swal.fire('Error!', 'সার্ভারে ব্যালেন্স ট্রান্সফার করতে সমস্যা হয়েছে। ইন্টারনেট চেক করুন।', 'error');
        }
    }
};

// ==========================================
// --- GLOBAL DISPLAY SETTINGS (DATABASE CONTROL) ---
// ==========================================
window.saveDisplaySettings = async function() {
    const isChecked = document.getElementById('toggle-bazar-report').checked;
    
    try {
        // 🪄 ম্যাজিক: কোনো টোকেন বা হেডার ম্যানুয়ালি দিতে হলো না! Interceptor নিজে বসিয়ে নেবে।
        const response = await fetch(`${API_BASE_URL}/settings`, {
            method: 'POST',
            body: JSON.stringify({ showBazarReport: isChecked })
        });

        if (response.ok) {
            if (!state.settings) state.settings = {};
            state.settings.showBazarReport = isChecked;
            
            if(typeof renderBazarTable === 'function') renderBazarTable();
            
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: isChecked ? 'Global Report Enabled!' : 'Global Report Hidden!' });
        } else {
            Swal.fire('Error!', 'সেটিংস সেভ করতে ব্যর্থ হয়েছে।', 'error');
        }
    } catch (error) {
        console.error("Settings Update Error:", error);
        Swal.fire('Error!', 'সার্ভারে কানেক্ট করতে সমস্যা হয়েছে।', 'error');
    }
};

// ১. ডাটাবেস থেকে বর্তমান লিংকটি বক্সে লোড করা
window.loadPublicLink = async function() {
    try {
        const token = localStorage.getItem('managerToken'); // টোকেন নেওয়া হলো
        const res = await fetch(`${API_BASE_URL}/public/get-token`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` } // 🛡️ ম্যাজিক: জোর করে টোকেন পাঠানো হলো!
        });
        const data = await res.json();
        
        if(data.success && data.shareToken) {
            let basePath = window.location.href.split('?')[0].replace('index.html', '');
            if (!basePath.endsWith('/')) basePath += '/';
            
            // ইনপুট বক্সে লিংকটি বসিয়ে দেওয়া হচ্ছে
            document.getElementById('public-link-input').value = `${basePath}public-view.html?token=${data.shareToken}`;
        }
    } catch(err) { console.error(err); }
};

// ২. ইনপুট বক্স থেকে লিংক কপি করা
window.copyPublicLink = function() {
    const linkInput = document.getElementById('public-link-input');
    if(linkInput.value && !linkInput.value.includes('Loading')) {
        navigator.clipboard.writeText(linkInput.value);
        Swal.fire('Copied!', 'পাবলিক লিংক কপি হয়েছে। মেম্বারদের পাঠিয়ে দিন!', 'success');
    }
};

// ৩. আগের লিংক বাতিল করে নতুন লিংক তৈরি করা
window.resetPublicLink = function() {
    Swal.fire({
        title: 'Reset Link?',
        text: "আগের লিংকটি বাতিল হয়ে যাবে এবং নতুন লিংক তৈরি হবে।",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, Reset'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('managerToken');
                const res = await fetch(`${API_BASE_URL}/public/reset-token`, { 
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                
                if(data.success) {
                    await window.loadPublicLink(); // বক্সে নতুন লিংক আপডেট করা
                    Swal.fire('Reset Done!', 'আগের লিংক বাতিল করে নতুন লিংক জেনারেট হয়েছে!', 'success');
                }
            } catch(err) { console.error(err); }
        }
    });
};

// ==========================================
// --- PROFILE MANAGEMENT LOGIC ---
// ==========================================

// ১. ডাটাবেস থেকে প্রোফাইল ও বিলিং ডেটা এনে বক্সে বসানো
window.loadProfileData = async function() {
    try {
        const token = localStorage.getItem('managerToken') || localStorage.getItem('messToken'); 
        const res = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        
        if (json.success && json.data) {
            document.getElementById('profile-name').value = json.data.messName || '';
            document.getElementById('profile-email').value = json.data.messEmail || '';

            const subStatus = json.data.subscriptionStatus || 'trial';
            const trialEndsAt = json.data.trialEndsAt;
            
            localStorage.setItem('subscriptionStatus', subStatus);
            if(trialEndsAt) localStorage.setItem('trialEndsAt', trialEndsAt);
            
            const planNameEl = document.getElementById('profile-plan-name');
            const planStatusEl = document.getElementById('profile-plan-status');
            const planExpiryEl = document.getElementById('profile-plan-expiry');
            const upgradeBtn = document.querySelector('button[onclick="showUpgradeModal()"]');

            // 🚀 ম্যাজিক ১: Free Mode চেক (অ্যাক্টিভ কিন্তু মেয়াদ null)
            if (subStatus === 'active' && !trialEndsAt) {
                // পুরো "Billing & Subscription" কার্ডটি খুঁজে বের করে ১০০% হাইড করা
                const allElements = document.querySelectorAll('*');
                for (let el of allElements) {
                    if (el.textContent && el.textContent.trim() === 'Billing & Subscription') {
                        const mainCard = el.closest('.card') || el.parentElement.parentElement;
                        if (mainCard) mainCard.style.display = 'none'; // কার্ড উধাও!
                        break;
                    }
                }
                if (upgradeBtn) upgradeBtn.style.display = 'none';
            } 
            // 🚀 ম্যাজিক ২: Premium Mode
            else if (subStatus === 'active' && trialEndsAt) {
                if(planNameEl) {
                    planNameEl.innerText = 'Premium Pro';
                    planNameEl.className = 'fw-bolder text-success fs-5';
                }
                if(planStatusEl) {
                    planStatusEl.innerText = 'Active';
                    planStatusEl.className = 'badge bg-success text-white px-2 py-1 shadow-sm';
                }
                if(planExpiryEl) {
                    const expiryDate = new Date(trialEndsAt);
                    planExpiryEl.innerText = expiryDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                }
                if(upgradeBtn) upgradeBtn.style.display = 'none'; 
            } 
            // 🚀 ম্যাজিক ৩: Free Trial Mode
            else {
                if(planNameEl) {
                    planNameEl.innerText = 'Free Trial';
                    planNameEl.className = 'fw-bold text-dark fs-5';
                }
                if(upgradeBtn) upgradeBtn.style.display = 'block'; 
                
                if (trialEndsAt && planExpiryEl && planStatusEl) {
                    const trialDate = new Date(trialEndsAt);
                    const today = new Date();
                    planExpiryEl.innerText = trialDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                    
                    const diffDays = Math.ceil((trialDate - today) / (1000 * 60 * 60 * 24));
                    if (diffDays > 0) {
                        planStatusEl.innerText = `${diffDays} Days Left`;
                        planStatusEl.className = 'badge bg-warning text-dark px-2 py-1 shadow-sm';
                    } else {
                        planStatusEl.innerText = 'Expired';
                        planStatusEl.className = 'badge bg-danger text-white px-2 py-1 shadow-sm';
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error loading profile:", error);
    }
};

// ২. প্রোফাইল আপডেট ফর্ম সাবমিট করা
document.getElementById('form-update-profile')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const messName = document.getElementById('profile-name').value;
    const messEmail = document.getElementById('profile-email').value;
    const oldPin = document.getElementById('profile-old-pin').value;
    const newPin = document.getElementById('profile-new-pin').value;

    if ((oldPin && !newPin) || (!oldPin && newPin)) {
        return Swal.fire('Oops!', 'পিন পরিবর্তন করতে চাইলে বর্তমান পিন এবং নতুন পিন দুটোই দিতে হবে!', 'warning');
    }

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';
    btn.disabled = true;

    try {
        const token = localStorage.getItem('managerToken') || localStorage.getItem('messToken');
        
        const res = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // 🛡️ আপডেট করার সময়ও টোকেন পাঠানো হলো
            },
            body: JSON.stringify({ messName, messEmail, oldPin, newPin })
        });
        
        const data = await res.json();

        if (res.ok) {
            Swal.fire('Success!', 'প্রোফাইল সফলভাবে আপডেট হয়েছে!', 'success');
            
            // পিন বা ইমেইল পরিবর্তন হলে নিরাপত্তার জন্য আবার লগিন করতে বলা
            if (oldPin || newPin || messEmail) {
                setTimeout(() => {
                    if(typeof handleLogout === 'function') handleLogout(); 
                    else {
                        localStorage.clear();
                        window.location.reload();
                    }
                }, 2000);
            }
        } else {
            Swal.fire('Error!', data.message || 'আপডেট ফেইল হয়েছে!', 'error');
        }
    } catch (error) {
        Swal.fire('Error!', 'সার্ভারে কানেক্ট করা যাচ্ছে না!', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        document.getElementById('profile-old-pin').value = '';
        document.getElementById('profile-new-pin').value = '';
    }
});

// ==========================================
// --- SUBSCRIPTION & TRIAL LOCK LOGIC ---
// ==========================================

window.isAppLocked = false; // গ্লোবাল লক ভেরিয়েবল

function checkSubscriptionStatus() {
    const subStatus = localStorage.getItem('subscriptionStatus');
    const trialEndsAt = localStorage.getItem('trialEndsAt');
    
    // যদি ইউজারের ট্রায়াল ডেট না থাকে (পুরনো অ্যাকাউন্ট), তবে তাকে ডিস্টার্ব করবো না
    if (!trialEndsAt) return; 

    const trialDate = new Date(trialEndsAt);
    const today = new Date();
    
    // কত দিন বাকি আছে ক্যালকুলেট করা
    const diffTime = trialDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const bannerContainer = document.getElementById('subscription-banner-container');
    if (!bannerContainer) return;

    // যদি পেমেন্ট করা থাকে (Active), তাহলে কোনো ব্যানার বা লক থাকবে না
    if (subStatus === 'active') {
        bannerContainer.innerHTML = '';
        window.isAppLocked = false;
        return;
    }

    if (diffDays > 0) {
        // ট্রায়াল চলছে...
        window.isAppLocked = false;
        
        // শর্ত: শুধুমাত্র শেষ ৩ দিন বাকি থাকলে ব্যানার দেখাবে
        if (diffDays <= 3) {
            bannerContainer.innerHTML = `
                <div class="alert alert-warning d-flex flex-column flex-md-row justify-content-between align-items-md-center fw-bold py-3 shadow-sm border-0 mb-4" style="border-radius: 12px; background: #fffbeb; color: #b45309; border-left: 5px solid #f59e0b !important;">
                    <div class="mb-2 mb-md-0"><i class="bi bi-clock-history me-2 fs-5"></i> আপনার ফ্রি ট্রায়াল আর মাত্র <span class="text-danger fs-5 mx-1">${diffDays}</span> দিন পর শেষ হবে!</div>
                    <button class="btn btn-dark btn-sm rounded-pill px-4 shadow-sm" onclick="showUpgradeModal()">Upgrade Now</button>
                </div>
            `;
        } else {
            // ৩ দিনের বেশি সময় থাকলে ব্যানার গায়েব থাকবে
            bannerContainer.innerHTML = '';
        }

    } else {
        // ট্রায়াল শেষ! (লক স্ক্রিন)
        window.isAppLocked = true;
        bannerContainer.innerHTML = `
            <div class="alert alert-danger d-flex flex-column flex-md-row justify-content-between align-items-md-center fw-bold py-3 shadow-sm border-0 mb-4" style="border-radius: 12px; background: #fef2f2; color: #b91c1c; border-left: 5px solid #ef4444 !important;">
                <div class="mb-2 mb-md-0"><i class="bi bi-shield-lock-fill me-2 fs-5"></i> আপনার ফ্রি ট্রায়াল শেষ! অ্যাপটি লক হয়ে গেছে। দয়া করে সাবস্ক্রিপশন রিনিউ করুন।</div>
                <button class="btn btn-danger btn-sm rounded-pill px-4 shadow-sm" onclick="showUpgradeModal()">Unlock App</button>
            </div>
        `;
        
        lockAppUI();
    }
}

function lockAppUI() {
    // ১. জোর করে ইউজারকে Dashboard এ নিয়ে আসা (অন্য পেজে থাকলে)
    const dashboardBtn = document.querySelector('[data-target="dashboard"]');
    if(dashboardBtn && !dashboardBtn.classList.contains('active')) {
        dashboardBtn.click();
    }

    // ২. ন্যাভিগেশন বার থেকে Dashboard এবং Auth বাটন ছাড়া বাকি সব পেজ লুকানো
    const navItems = document.querySelectorAll('.nav-link.nav-btn');
    navItems.forEach(nav => {
        const target = nav.getAttribute('data-target');
        if (target !== 'dashboard' && target !== 'profile') {
            nav.parentElement.style.display = 'none'; 
        }
    });

    // ৩. ড্যাশবোর্ডের ভেতরের অ্যাকশন বাটনগুলো ডিজেবল করা
    const actionButtons = document.querySelectorAll('button[onclick="downloadLowBalanceImage()"], button[onclick="copyLowBalanceNames()"]');
    actionButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });
}

// 🚀 প্যাকেজ সিলেক্ট, ডায়নামিক প্রাইস এবং প্রফেশনাল পেমেন্ট মোডাল
window.showUpgradeModal = async function() {
    
    // ১. প্রথমে ডাটাবেস থেকে লাইভ প্রাইস নিয়ে আসার জন্য একটি ছোট লোডিং দেখানো হবে
    Swal.fire({
        title: 'Please wait...',
        text: 'Loading premium packages',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    let monthPrice = 99; // ডিফল্ট
    let yearPrice = 999; // ডিফল্ট

    try {
        // 🚀 অ্যাডমিনের সেট করা নতুন দাম সার্ভার থেকে টেনে আনা হচ্ছে
        const res = await fetch(`${API_BASE_URL}/admin/pricing`);
        const data = await res.json();
        if (data.success && data.data) {
            monthPrice = data.data.monthlyPrice;
            yearPrice = data.data.yearlyPrice;
        }
    } catch (error) {
        console.error("Failed to fetch pricing, using defaults.");
    }

    // ২. এবার আসল মোডালটি দেখানো হবে ডায়নামিক প্রাইস সহ
    Swal.fire({
        title: '<i class="bi bi-shield-lock text-primary me-2"></i> Premium Upgrade',
        html: `
            <p class="text-muted small mb-4">Unlock all features with our secured billing system.</p>
            
            <div class="row g-2 mb-4">
                <div class="col-6">
                    <div class="border rounded p-3 text-center package-card" id="card-month" style="cursor: pointer; border-color: #6366f1; background-color: #f8fafc; transition: 0.3s;" onclick="selectPackage(${monthPrice}, 'card-month')">
                        <input class="form-check-input d-none" type="radio" name="package" id="pkg-month" value="${monthPrice}" checked>
                        <div class="fw-bold text-dark"><i class="bi bi-calendar-event me-1"></i> 1 Month</div>
                        <div class="fs-5 fw-bolder mt-2 text-primary">৳${monthPrice}</div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="border rounded p-3 text-center position-relative package-card" id="card-year" style="cursor: pointer; border-color: #e2e8f0; background-color: #ffffff; transition: 0.3s;" onclick="selectPackage(${yearPrice}, 'card-year')">
                        <span class="position-absolute top-0 start-50 translate-middle badge rounded-pill bg-danger shadow-sm" style="font-size: 0.65rem;">Best Value</span>
                        <input class="form-check-input d-none" type="radio" name="package" id="pkg-year" value="${yearPrice}">
                        <div class="fw-bold text-dark"><i class="bi bi-calendar3 me-1"></i> 1 Year</div>
                        <div class="fs-5 fw-bolder mt-2 text-muted">৳${yearPrice}</div>
                    </div>
                </div>
            </div>

            <div class="mb-4 text-start">
                <label class="form-label small fw-bold text-secondary"><i class="bi bi-tags me-1"></i> Have a Promo Code?</label>
                <div class="input-group shadow-sm">
                    <input type="text" id="promo-code" class="form-control text-uppercase fw-bold" placeholder="Enter code" style="border-right: none;">
                    <button class="btn btn-dark px-3 fw-bold" type="button" id="apply-btn" onclick="applyPromo()">Apply</button>
                </div>
                <div id="promo-message" class="small mt-2 fw-semibold" style="display: none;"></div>
            </div>

            <div class="border rounded p-3 text-start mb-2" style="background-color: #f8fafc;">
                <div class="d-flex justify-content-between small mb-2 text-muted">
                    <span>Subtotal</span>
                    <span class="fw-bold" id="summary-subtotal">৳${monthPrice}</span>
                </div>
                <div class="d-flex justify-content-between small mb-2 text-success" id="summary-discount-row" style="display: none !important;">
                    <span><i class="bi bi-check-circle-fill me-1"></i> Discount Applied</span>
                    <span class="fw-bold" id="summary-discount">-৳0</span>
                </div>
                <hr class="my-2 text-muted">
                <div class="d-flex justify-content-between">
                    <span class="fw-bold text-dark">Total Payable</span>
                    <span class="fw-bolder fs-5 text-dark" id="summary-total">৳${monthPrice}</span>
                </div>
            </div>
            
            <div class="text-center mt-3">
                <p class="text-muted mb-0" style="font-size: 0.75rem;"><i class="bi bi-lock-fill text-success"></i> Secure Checkout by bKash</p>
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#e11471',
        cancelButtonColor: '#64748b',
        cancelButtonText: 'Cancel',
        confirmButtonText: 'Proceed to Pay <i class="bi bi-arrow-right-short fs-5"></i>',
        showLoaderOnConfirm: true,
        didOpen: () => {
            window.selectedPrice = monthPrice; // 🚀 ডাটাবেস থেকে আসা কারেন্ট প্রাইস
            window.appliedPromo = '';
            
            window.selectPackage = function(price, cardId) {
                window.selectedPrice = price;
                window.appliedPromo = '';
                
                // Reset card styles
                document.getElementById('card-month').style.borderColor = '#e2e8f0';
                document.getElementById('card-month').style.backgroundColor = '#ffffff';
                document.querySelector('#card-month .fs-5').classList.replace('text-primary', 'text-muted');

                document.getElementById('card-year').style.borderColor = '#e2e8f0';
                document.getElementById('card-year').style.backgroundColor = '#ffffff';
                document.querySelector('#card-year .fs-5').classList.replace('text-primary', 'text-muted');
                
                // Highlight selected card
                document.getElementById(cardId).style.borderColor = '#6366f1';
                document.getElementById(cardId).style.backgroundColor = '#f8fafc';
                document.querySelector(`#${cardId} .fs-5`).classList.replace('text-muted', 'text-primary');
                
                // Reset Summary Box
                document.getElementById('summary-subtotal').innerText = `৳${price}`;
                document.getElementById('summary-discount-row').style.setProperty('display', 'none', 'important');
                document.getElementById('summary-total').innerText = `৳${price}`;
                
                // Reset Promo Box
                document.getElementById('promo-code').value = '';
                document.getElementById('promo-message').style.display = 'none';
                const btn = document.getElementById('apply-btn');
                btn.innerText = 'Apply';
                btn.classList.remove('btn-success', 'btn-danger');
                btn.classList.add('btn-dark');
                btn.disabled = false;
            };

            window.applyPromo = async function() {
                const code = document.getElementById('promo-code').value.trim();
                const msgEl = document.getElementById('promo-message');
                const btn = document.getElementById('apply-btn');
                
                if(!code) return;
                
                btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
                btn.disabled = true;

                try {
                    const token = localStorage.getItem('messToken') || localStorage.getItem('managerToken');
                    const res = await fetch(`${API_BASE_URL}/payment/verify-coupon`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ promoCode: code, packagePrice: window.selectedPrice })
                    });
                    const data = await res.json();
                    
                    if(data.success) {
                        window.appliedPromo = code;
                        
                        btn.innerHTML = '<i class="bi bi-check2"></i>';
                        btn.classList.replace('btn-dark', 'btn-success');
                        
                        msgEl.innerHTML = `<i class="bi bi-check-circle-fill"></i> ${data.message}`;
                        msgEl.className = 'small mt-2 text-success';
                        msgEl.style.display = 'block';

                        // Show Live Calculation
                        document.getElementById('summary-discount-row').style.setProperty('display', 'flex', 'important');
                        document.getElementById('summary-discount').innerText = `-৳${data.discountAmount}`;
                        document.getElementById('summary-total').innerText = `৳${data.finalPrice}`;
                    } else {
                        btn.innerHTML = 'Apply';
                        btn.disabled = false;
                        
                        msgEl.innerHTML = `<i class="bi bi-exclamation-circle-fill"></i> ${data.message}`;
                        msgEl.className = 'small mt-2 text-danger';
                        msgEl.style.display = 'block';
                        
                        document.getElementById('summary-discount-row').style.setProperty('display', 'none', 'important');
                        document.getElementById('summary-total').innerText = `৳${window.selectedPrice}`;
                        window.appliedPromo = '';
                    }
                } catch(err) {
                    btn.innerHTML = 'Apply';
                    btn.disabled = false;
                }
            };
        },
        preConfirm: async () => {
            // 🚀 ম্যাজিক: ক্লিক করার সাথে সাথেই বাটন লোডিং স্টেটে চলে যাবে
            const confirmBtn = Swal.getConfirmButton();
            confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Connecting bKash...';
            confirmBtn.disabled = true; // বাটন ডিজেবল করে দেওয়া হলো যাতে ডাবল ক্লিক না পড়ে
            Swal.getCancelButton().style.display = 'none'; // ক্যানসেল বাটন হাইড

            try {
                const token = localStorage.getItem('messToken') || localStorage.getItem('managerToken');
                const res = await fetch(`${API_BASE_URL}/payment/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ packagePrice: window.selectedPrice, promoCode: window.appliedPromo }) 
                });
                
                const data = await res.json();
                if (res.ok && data.success && data.bkashURL) return data.bkashURL; 
                else {
                    confirmBtn.innerHTML = 'Proceed to Pay';
                    confirmBtn.disabled = false;
                    Swal.showValidationMessage(data.message || 'Payment failed.');
                }
            } catch (error) {
                confirmBtn.innerHTML = 'Proceed to Pay';
                confirmBtn.disabled = false;
                Swal.showValidationMessage('Server connection error!');
            }
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            window.location.href = result.value;
        }
    });
};

// পেজ লোড হওয়ার পর সাবস্ক্রিপশন চেক কল করা
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(checkSubscriptionStatus, 500); 
});