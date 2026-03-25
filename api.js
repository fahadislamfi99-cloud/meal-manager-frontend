

// ==========================================
// 🛡️ SAAS MAGIC: GLOBAL FETCH INTERCEPTOR
// ==========================================
const originalFetch = window.fetch;
window.fetch = async function(resource, config) {
    // যদি রিকোয়েস্ট আমাদের API তে যায় এবং সেটি লগিন বা রেজিস্ট্রেশন না হয়
    if (typeof resource === 'string' && resource.includes('/api/') && !resource.includes('/api/auth')) {
        const token = localStorage.getItem('messToken');
        
        config = config || {};
        config.headers = config.headers || {};
        
        // ১. অটোমেটিক টোকেন যুক্ত করা
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.warn("⚠️ No token found! Redirecting to login...");
            window.location.href = 'login.html'; // পরবর্তীতে এই লাইনটি চালু করে দেবেন
        }
        
        // ২. Content-Type ঠিক রাখা
        if (!config.headers['Content-Type'] && config.method && config.method !== 'GET') {
            config.headers['Content-Type'] = 'application/json';
        }
    }
    return originalFetch(resource, config);
};

// --- DATA FETCHING (GET) WITH LOADING ANIMATION ---
async function loadAllData() {
    visibleMealLimit = 5;   // নতুন ডেটা লোড হলে লিমিট রিসেট হবে
    visibleBazarLimit = 5;

    // ১. সার্ভারে রিকোয়েস্ট পাঠানোর আগেই স্ক্রিনের সব জায়গায় লোডিং স্পিনার বসিয়ে দেওয়া
    showLoadingSpinners();

    try {
        // ১. ম্যাজিক: সবার আগে ডাটাবেস থেকে সেটিংস এবং আসল তারিখ নিয়ে আসা! (এই লাইনটি নতুন)
        await fetchSettings(); 
        
        // ২. Render-এর ফ্রি সার্ভার যাতে হ্যাং না হয়, তাই একসাথে ৫টি রিকোয়েস্ট না পাঠিয়ে একটি একটি করে পাঠানো হচ্ছে
        await fetchTerms();
        await fetchMembers();
        await fetchBazar();
        await fetchMeals();
        await fetchDeposits();
        await fetchReport();
        await loadPublicLink();
    } catch (error) {
        console.error("API Fetch Error:", error);
    }

    // ৩. ডেটা আসার পর লোডিং স্পিনার সরিয়ে আসল ডেটা রেন্ডার করা
    renderAll();
    applyAuthRules();
}

async function fetchMembers() {
    const res = await fetch(`${API_BASE_URL}/members`);
    const json = await res.json();
    if (json.success) {
        // Room Number অনুযায়ী ছোট থেকে বড় (Ascending) সাজানো হচ্ছে
        state.members = json.data.sort((a, b) =>
            a.room.localeCompare(b.room, undefined, { numeric: true })
        );
    }
}

async function fetchBazar() {
    // গ্লোবাল ডেট ব্যবহার করা হচ্ছে
    const res = await fetch(`${API_BASE_URL}/bazar?startDate=${globalStartDate}&endDate=${globalEndDate}`);
    const json = await res.json();
    if (json.success) state.bazar = json.data;
}

async function fetchMeals() {
    // গ্লোবাল ডেট ব্যবহার করা হচ্ছে
    const res = await fetch(`${API_BASE_URL}/meals?startDate=${globalStartDate}&endDate=${globalEndDate}`);
    const json = await res.json();
    if (json.success) state.meals = json.data;
}

async function fetchDeposits() {
    // গ্লোবাল ডেট ব্যবহার করা হচ্ছে
    const res = await fetch(`${API_BASE_URL}/deposits?startDate=${globalStartDate}&endDate=${globalEndDate}`);
    const json = await res.json();
    if (json.success) state.deposits = json.data;
}

async function fetchSettings() {
    try {
        const res = await fetch(`${API_BASE_URL}/settings`);
        const json = await res.json();
        if (json.success && json.data) {
            state.settings = json.data;
            
            // ম্যাজিক: ডাটাবেসে যদি ডেট সেভ করা থাকে, তবে বর্তমান মাসের বদলে সেটাকে বসিয়ে দেওয়া হবে!
            if (state.settings.periodStart && state.settings.periodEnd) {
                globalStartDate = state.settings.periodStart;
                globalEndDate = state.settings.periodEnd;
                
                // Settings পেজের ইনপুট বক্সেও ডেটগুলো বসিয়ে দেওয়া
                const startInput = document.getElementById('global-start-date');
                const endInput = document.getElementById('global-end-date');
                if(startInput) startInput.value = globalStartDate;
                if(endInput) endInput.value = globalEndDate;
                
                // UI আপডেট করা
                if(typeof updateDateRangeDisplay === 'function') updateDateRangeDisplay();
            }
        }
    } catch (error) { console.error("Error fetching settings:", error); }
}

// ফ্রন্টএন্ডের আপডেট করা fetchReport ফাংশন
async function fetchReport() {
    if (!globalStartDate || !globalEndDate) return;

    try {
        // ম্যাজিক: URL এর শেষ থেকে getReportQueryString() অংশটুকু মুছে দেওয়া হলো
        const res = await fetch(`${API_BASE_URL}/report?startDate=${globalStartDate}&endDate=${globalEndDate}`);
        const json = await res.json();

        if (json.success) {
            json.data.members.sort((a, b) =>
                String(a.room).localeCompare(String(b.room), undefined, { numeric: true })
            );
            state.report = json.data;
            if (typeof renderReportTable === 'function') {
                renderReportTable();
            }
        }
    } catch (error) {
        console.error("Error fetching report:", error);
    }
}

// Delete Meal
function deleteMeal(id) {
    Swal.fire({
        title: 'Delete this meal?',
        text: "You can re-add it from the form above.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete!',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/meals/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Error');
                await loadAllData();
                return true;
            } catch (error) {
                Swal.showValidationMessage('সমস্যা হয়েছে!');
            }
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Deleted!', text: 'Meal entry has been deleted.', icon: 'success', timer: 1500, showConfirmButton: false });
        }
    });
}

// Delete Bazar
function deleteBazar(id) {
    Swal.fire({
        title: 'Delete Bazar Entry?',
        text: "This will remove the expense from the total calculation.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete!',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/bazar/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Error');
                await loadAllData();
                return true;
            } catch (error) {
                Swal.showValidationMessage('সমস্যা হয়েছে!');
            }
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Deleted!', text: 'Bazar entry has been deleted.', icon: 'success', timer: 1500, showConfirmButton: false });
        }
    });
}

// Delete Deposit
function deleteDeposit(id) {
    Swal.fire({
        title: 'Delete Deposit/Refund?',
        text: "This will directly affect the member's balance.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete!',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/deposits/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Error');
                await loadAllData();
                return true;
            } catch (error) {
                Swal.showValidationMessage('সমস্যা হয়েছে!');
            }
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Deleted!', text: 'Entry has been deleted.', icon: 'success', timer: 1500, showConfirmButton: false });
        }
    });
}

// Clear Today's Meals
function clearTodaysMeals() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now.getTime() - offset)).toISOString().split('T')[0];
    const todaysMeals = state.meals.filter(meal => meal.date.startsWith(localISOTime));

    if (todaysMeals.length === 0) {
        Swal.fire('Oops!', 'আজকের তালিকায় কোনো মিল নেই!', 'info');
        return;
    }

    Swal.fire({
        title: 'Clear All Meals?',
        text: `আপনি কি নিশ্চিত যে আজকের সব মিল (${todaysMeals.length} টি এন্ট্রি) ডিলিট করতে চান?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, clear all!',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            try {
                for (const meal of todaysMeals) {
                    await fetch(`${API_BASE_URL}/meals/${meal._id}`, { method: 'DELETE' });
                }
                await loadAllData();
                return true;
            } catch (error) {
                Swal.showValidationMessage('ডিলিট করতে সমস্যা হয়েছে!');
            }
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Cleared!', text: 'আজকের সব মিল সফলভাবে ডিলিট করা হয়েছে।', icon: 'success', timer: 2000, showConfirmButton: false });
        }
    });
}

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
        showLoaderOnConfirm: true, 
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
        allowOutsideClick: () => !Swal.isLoading() 
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Deleted!', text: 'Member has been deleted.', icon: 'success', timer: 1500, showConfirmButton: false });
        }
    });
}

// ==========================================
// --- DELETE FULL DAY BAZAR LOGIC ---
// ==========================================
function deleteFullDayBazar(dateStr) {
    // ওই নির্দিষ্ট তারিখের সব বাজারের আইটেমগুলো ফিল্টার করা
    const daysItems = state.bazar.filter(b => b.date.startsWith(dateStr));

    if (daysItems.length === 0) return;

    Swal.fire({
        title: 'Delete Entire Day?',
        text: `আপনি কি নিশ্চিত যে এই তারিখের সব বাজার (${daysItems.length} টি আইটেম) একসাথে ডিলিট করতে চান?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete all!',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            try {
                // লুপ চালিয়ে ওই দিনের সব আইটেম ব্যাকএন্ড থেকে ডিলিট করা হচ্ছে
                for (const item of daysItems) {
                    await fetch(`${API_BASE_URL}/bazar/${item._id}`, { method: 'DELETE' });
                }
                await loadAllData();
                return true;
            } catch (error) {
                Swal.showValidationMessage('ডিলিট করতে সমস্যা হয়েছে!');
            }
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Deleted!', text: 'ওই দিনের সব বাজার সফলভাবে ডিলিট করা হয়েছে।', icon: 'success', timer: 2000, showConfirmButton: false });
        }
    });
}

async function fetchTerms() {
    try {
        const res = await fetch(`${API_BASE_URL}/manager/terms`);
        const json = await res.json();
        if (json.success && json.data) {
            state.terms = json.data;
            populateTermSelector();
        }
    } catch (error) { console.error("Error fetching terms:", error); }
}

function populateTermSelector() {
    const selector = document.getElementById('term-selector');
    if (!selector) return;
    selector.innerHTML = '';
    
    state.terms.forEach(term => {
        const startStr = new Date(term.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const endStr = term.isActive ? 'Present' : new Date(term.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const mgrName = term.member ? term.member.name : 'Unknown';
        const activeText = term.isActive ? ' 🟢 (Current)' : '';
        
        const option = document.createElement('option');
        option.value = term._id;
        option.dataset.start = term.startDate;
        // যদি রানিং সেশন হয়, তাহলে endDate হিসেবে আজকের তারিখ সেট হবে
        option.dataset.end = term.isActive ? new Date().toISOString().split('T')[0] : term.endDate; 
        option.text = `${startStr} - ${endStr} | Mgr: ${mgrName}${activeText}`;
        
        // ডিফল্টভাবে রানিং সেশনটি সিলেক্টেড থাকবে
        if (term.isActive && !localStorage.getItem('selectedTermId')) {
            option.selected = true;
            globalStartDate = option.dataset.start;
            globalEndDate = option.dataset.end;
        } else if (localStorage.getItem('selectedTermId') === term._id) {
            option.selected = true;
            globalStartDate = option.dataset.start;
            globalEndDate = option.dataset.end;
        }
        
        selector.appendChild(option);
    });
    
    if(typeof updateDateRangeDisplay === 'function') updateDateRangeDisplay();
}

window.applyTermFilter = function() {
    const selector = document.getElementById('term-selector');
    const selectedOption = selector.options[selector.selectedIndex];
    
    globalStartDate = selectedOption.dataset.start;
    globalEndDate = selectedOption.dataset.end;
    localStorage.setItem('selectedTermId', selectedOption.value);
    
    updateDateRangeDisplay();
    loadAllData();
    
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    Toast.fire({ icon: 'success', title: 'Session Loaded!' });
    
    const dashboardBtn = document.querySelector('.nav-btn[data-target="dashboard"]');
    if (dashboardBtn) dashboardBtn.click();
};