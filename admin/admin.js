const API_BASE_URL = 'https://meal-manager-backend-kp8y.onrender.com/api';

// 🛡️ Route Guard: টোকেন না থাকলে সরাসরি লগিন পেজে পাঠিয়ে দেবে
const adminToken = localStorage.getItem('superAdminToken');
if (!adminToken) {
    window.location.replace('index.html'); // লগিন পেজে রিডাইরেক্ট
}

let currentMonthlyPrice = 99; // ডিফল্ট প্রাইস

// ==========================================
// ⏱️ Helper: দিন, মাস, বছর নিখুঁতভাবে হিসাব করার ফাংশন
// ==========================================
function formatRemainingTime(endDate) {
    if (!endDate) return 'Lifetime Access';
    const end = new Date(endDate);
    const now = new Date();
    if (end <= now) return 'Expired';

    let years = end.getFullYear() - now.getFullYear();
    let months = end.getMonth() - now.getMonth();
    let days = end.getDate() - now.getDate();

    if (days < 0) {
        months -= 1;
        const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
        days += prevMonth;
    }
    if (months < 0) {
        years -= 1;
        months += 12;
    }

    let parts = [];
    if (years > 0) parts.push(`${years} Year${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} Month${months > 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} Day${days > 1 ? 's' : ''}`);

    return parts.length > 0 ? parts.join(', ') : 'Expires Today';
}

// ==========================================
// 📊 ১. ড্যাশবোর্ড লোড এবং ডেটা আনা
// ==========================================


async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/messes`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        // 🚀 ম্যাজিক ফিক্স: টোকেনের মেয়াদ শেষ হলে অটোমেটিক লগআউট করে দেবে!
        if (response.status === 401) {
            localStorage.removeItem('superAdminToken');
            window.location.replace('index.html');
            return;
        }

        const data = await response.json();

        if (data.success) {
            updateAnalytics(data.data);
            renderMessTable(data.data);
            checkGlobalSwitchState(data.data);
        } else {
            Swal.fire('Error', 'ডেটা লোড করতে সমস্যা হয়েছে!', 'error');
        }
    } catch (error) {
        console.error("Dashboard Load Error:", error);
    }
}

// ==========================================
// 📊 অ্যানালিটিক্স আপডেট এবং রিয়েল রেভিনিউ হিসাব
// ==========================================
async function updateAnalytics(messes) {
    const totalMesses = messes.length;
    const premiumMesses = messes.filter(m => m.subscriptionStatus === 'active' && m.trialEndsAt).length;
    const trialMesses = messes.filter(m => m.subscriptionStatus === 'trial').length;

    let realRevenue = 0;

    try {
        // 🚀 ডাটাবেস থেকে আসল ট্রানজেকশন হিস্ট্রি টেনে আনা হচ্ছে
        const res = await fetch(`${API_BASE_URL}/admin/transactions`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await res.json();

        if (data.success && data.data) {
            // ম্যাজিক: যতগুলো সফল পেমেন্ট আছে, সবগুলোর 'amount' একসাথে যোগ করা হচ্ছে
            realRevenue = data.data.reduce((total, trx) => {
                return total + (trx.status === 'Success' ? trx.amount : 0);
            }, 0);
        }
    } catch (error) {
        console.error("Error fetching real revenue:", error);
    }

    // ড্যাশবোর্ডের কার্ডগুলোতে ডেটা বসানো
    document.querySelectorAll('.stat-value')[0].innerText = totalMesses;
    document.querySelectorAll('.stat-value')[1].innerText = premiumMesses;
    document.querySelectorAll('.stat-value')[2].innerText = trialMesses;
    document.querySelectorAll('.stat-value')[3].innerText = `৳${realRevenue}`;

    // ==========================================
    // 🚀 Advanced SaaS Metrics (MRR & Churn) 
    // ==========================================
    const now = new Date();
    let expiredCount = 0;

    // মেয়াদ শেষ হওয়া (Expired) মেসগুলো খুঁজে বের করা
    messes.forEach(m => {
        if (m.trialEndsAt && new Date(m.trialEndsAt) < now) {
            expiredCount++;
        }
    });

    // ১. MRR ক্যালকুলেশন: (মোট অ্যাক্টিভ প্রিমিয়াম ইউজার * বর্তমান মাসিক ফি)
    const mrr = premiumMesses * currentMonthlyPrice;

    // ২. Churn Rate ক্যালকুলেশন: (বাতিল ইউজার / মোট ইউজার) * ১০০
    const churnRate = totalMesses > 0 ? ((expiredCount / totalMesses) * 100).toFixed(1) : 0;

    // UI তে ডেটা বসানো
    if(document.getElementById('stat-mrr')) document.getElementById('stat-mrr').innerText = `৳${mrr}`;
    if(document.getElementById('stat-churn')) document.getElementById('stat-churn').innerText = churnRate;
    if(document.getElementById('stat-expired-count')) document.getElementById('stat-expired-count').innerText = expiredCount;
}

// ==========================================
// 📋 ২. মেস লিস্ট (টেবিল) রেন্ডার করা
// ==========================================
// ==========================================
// 📊 Dashboard Overview: মেস টেবিল রেন্ডার করা
// ==========================================
function renderMessTable(messes) {
    const tbody = document.querySelector('.table tbody');
    tbody.innerHTML = '';

    if (messes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">কোনো মেস পাওয়া যায়নি।</td></tr>';
        return;
    }

    messes.reverse().forEach(mess => {
        const isTrial = mess.subscriptionStatus === 'trial';
        const isFreeMode = mess.subscriptionStatus === 'active' && !mess.trialEndsAt;
        const isPremium = mess.subscriptionStatus === 'active' && mess.trialEndsAt;

        const joinDate = new Date(mess.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        let statusBadge = '';
        let expiryText = ''; // 🚀 মেয়াদের টেক্সট রাখার জন্য নতুন ভেরিয়েবল
        let isBlocked = false;

        // 🚀 স্ট্যাটাস এবং নতুন মেয়াদ (দিন, মাস, বছর) হিসাব করা হচ্ছে
        if (isFreeMode) {
            statusBadge = `<span class="badge bg-info bg-opacity-10 text-info border border-info px-2 py-1">Free Lifetime</span>`;
            expiryText = `Unlimited Access`;
        } else if (isPremium) {
            statusBadge = `<span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1">Premium Pro</span>`;
            expiryText = `${formatRemainingTime(mess.trialEndsAt)} Left`;
        } else if (isTrial) {
            let diffDays = Math.ceil((new Date(mess.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
            if (diffDays > 0) {
                statusBadge = `<span class="badge bg-warning bg-opacity-10 text-dark px-2 py-1 border border-warning">Trial Active</span>`;
                expiryText = `${formatRemainingTime(mess.trialEndsAt)} Left`;
            } else {
                isBlocked = true;
                statusBadge = `<span class="badge bg-danger bg-opacity-10 text-danger px-2 py-1 border border-danger">Expired</span>`;
                expiryText = `Access Locked`;
            }
        }

        // 🚀 বাটন লজিক: ব্লক থাকলে Unblock বাটন, নাহলে Block বাটন
        let actionButton = isBlocked
            ? `<button class="btn btn-action btn-success shadow-sm" onclick="unblockMessSub('${mess._id}', '${mess.messName}')">Unblock</button>`
            : `<button class="btn btn-action btn-outline-danger shadow-sm" onclick="cancelMessSub('${mess._id}', '${mess.messName}')">Block / Cancel</button>`;

        tbody.innerHTML += `
            <tr>
                <td>
                    <div class="fw-bold text-dark">${mess.messName}</div>
                    <div class="small text-muted">Joined: ${joinDate}</div>
                </td>
                <td>
                    <div>${mess.messEmail}</div>
                    <div class="small text-muted">ID: ${mess._id.slice(-6).toUpperCase()}</div>
                </td>
                <td>
                    <div>${statusBadge}</div>
                    <div class="small text-muted mt-1" style="font-size: 0.75rem;"><i class="bi bi-clock-history me-1"></i>${expiryText}</div>
                </td>
                <td class="text-end">${actionButton}</td>
            </tr>
        `;
    });
}

// ==========================================
// 🎚️ ৩. গ্লোবাল ম্যাজিক সুইচ লজিক
// ==========================================
function checkGlobalSwitchState(messes) {
    // যদি বেশিরভাগ মেস "trial" স্টেটে থাকে, তার মানে সাবস্ক্রিপশন মোড অন করা আছে
    const isSubOn = messes.some(m => m.subscriptionStatus === 'trial' && m.trialEndsAt);

    const switchEl = document.getElementById('global-magic-switch');
    const modeText = document.getElementById('mode-text');
    const subText = modeText.nextElementSibling;

    if (switchEl) switchEl.checked = isSubOn;

    if (isSubOn) {
        modeText.innerText = "Premium Mode";
        modeText.className = "fw-bold text-primary fs-6";
        subText.innerText = "20 Days Trial Active";
    }
}

window.toggleMagicSwitch = async function (checkbox) {
    const isSubscriptionOn = checkbox.checked;
    const modeText = document.getElementById('mode-text');
    const subText = modeText.nextElementSibling;

    const confirmAction = await Swal.fire({
        title: isSubscriptionOn ? 'Enable Subscription Mode?' : 'Make App Free?',
        text: isSubscriptionOn
            ? "এটি অন করলে সবার ফ্রি অ্যাক্সেস বন্ধ হয়ে যাবে এবং ২০ দিনের ট্রায়াল কাউন্টডাউন শুরু হবে!"
            : "এটি অফ করলে সবার ট্রায়াল ডেট মুছে যাবে এবং অ্যাপ সবার জন্য ফ্রি হয়ে যাবে!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: isSubscriptionOn ? '#6366f1' : '#10b981',
        cancelButtonColor: '#64748b',
        confirmButtonText: isSubscriptionOn ? 'Yes, Turn On!' : 'Yes, Make it Free!'
    });

    if (confirmAction.isConfirmed) {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/toggle-subscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({ isSubscriptionOn })
            });

            const data = await res.json();

            if (res.ok) {
                Swal.fire('Success!', data.message, 'success');
                if (isSubscriptionOn) {
                    modeText.innerText = "Premium Mode";
                    modeText.className = "fw-bold text-primary fs-6";
                    subText.innerText = "20 Days Trial Active";
                } else {
                    modeText.innerText = "Free Mode";
                    modeText.className = "fw-bold text-dark fs-6";
                    subText.innerText = "App is open for all";
                }
                loadDashboardData(); // টেবিল রিলোড
            } else {
                checkbox.checked = !isSubscriptionOn; // রিভার্ট
                Swal.fire('Error', data.message, 'error');
            }
        } catch (error) {
            checkbox.checked = !isSubscriptionOn;
            Swal.fire('Error', 'সার্ভার এরর!', 'error');
        }
    } else {
        checkbox.checked = !isSubscriptionOn; // ক্যানসেল করলে আগের জায়গায় ফিরে যাবে
    }
}

// ==========================================
// 🚫 ৪. সাবস্ক্রিপশন ক্যানসেল / মেস ব্লক
// ==========================================
window.cancelMessSub = async function (id, name) {
    const { isConfirmed } = await Swal.fire({
        title: `Block "${name}"?`,
        text: "এই মেসটির মেয়াদ শেষ করে দেওয়া হবে এবং অ্যাপ লক হয়ে যাবে।",
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, Lock App!'
    });

    if (isConfirmed) {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/messes/${id}/cancel`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            const data = await res.json();

            if (res.ok) {
                Swal.fire('Locked!', data.message, 'success');
                loadDashboardData(); // ডেটা রিলোড
            } else {
                Swal.fire('Error', data.message, 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'সার্ভার কানেকশন ফেইল!', 'error');
        }
    }
}

// ==========================================
// 🎟️ ৫. কুপন তৈরি করা
// ==========================================
async function createCoupon(e) {
    e.preventDefault();
    const container = document.querySelector('.bg-indigo-50');
    const inputs = container.querySelectorAll('input, select');

    const code = inputs[0].value;
    const discountAmount = inputs[1].value;
    const discountType = inputs[2].value.includes('%') ? 'percentage' : 'flat';

    if (!code || !discountAmount) return Swal.fire('Oops!', 'কুপন কোড এবং পরিমাণ দিতে হবে!', 'warning');

    try {
        const res = await fetch(`${API_BASE_URL}/admin/coupons`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ code, discountAmount, discountType })
        });
        const data = await res.json();

        if (res.ok) {
            Swal.fire('Success!', `কুপন "${code}" সফলভাবে তৈরি হয়েছে!`, 'success');
            inputs[0].value = '';
            inputs[1].value = '';
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'সার্ভার এরর!', 'error');
    }
}

// ==========================================
// 🚪 ৬. লগআউট
// ==========================================
const logoutBtn = document.querySelector('.nav-link.text-danger');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        Swal.fire({
            title: 'Logout?',
            text: "অ্যাডমিন প্যানেল থেকে বের হতে চান?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Yes, Logout'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem('superAdminToken');
                window.location.replace('index.html');
            }
        });
    });
}

// ==========================================
// 🔓 ৪.২ আনব্লক করা 
// ==========================================
window.unblockMessSub = async function (id, name) {
    const { isConfirmed } = await Swal.fire({
        title: `Unblock "${name}"?`,
        text: "এই মেসটি আবার অ্যাপ ব্যবহার করতে পারবে।",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, Unblock!'
    });

    if (isConfirmed) {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/messes/${id}/unblock`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            const data = await res.json();

            if (res.ok) {
                Swal.fire('Unblocked!', data.message, 'success');
                loadDashboardData(); // ডেটা রিলোড
            } else {
                Swal.fire('Error', data.message, 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'সার্ভার কানেকশন ফেইল!', 'error');
        }
    }
}

// ==========================================
// ⚙️ ৭. প্রাইস কন্ট্রোল (Load & Update)
// ==========================================
async function loadPricing() {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/pricing`);
        const data = await res.json();
        if (data.success && data.data) {
            currentMonthlyPrice = data.data.monthlyPrice; // 🚀 গ্লোবাল ভেরিয়েবলে সেভ করা হলো
            document.getElementById('admin-price-month').value = data.data.monthlyPrice;
            document.getElementById('admin-price-year').value = data.data.yearlyPrice;
            if (document.getElementById('current-notice-display')) {
                document.getElementById('current-notice-display').innerHTML = `Current Notice: <span class="fw-bold text-dark">${data.data.globalNotice || '<span class="fst-italic text-muted">None (Hidden)</span>'}</span>`;
            }
        }
    } catch (e) { console.error("Price Load Error", e); }
}



window.updateAdminPricing = async function () {
    const month = document.getElementById('admin-price-month').value;
    const year = document.getElementById('admin-price-year').value;

    const btn = document.querySelector('button[onclick="updateAdminPricing()"]');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

    try {
        const res = await fetch(`${API_BASE_URL}/admin/pricing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ monthlyPrice: month, yearlyPrice: year })
        });
        const data = await res.json();

        if (res.ok) Swal.fire('Saved!', 'Pricing has been updated globally.', 'success');
        else Swal.fire('Error', data.message, 'error');
    } catch (e) {
        Swal.fire('Error', 'Server connection failed!', 'error');
    } finally {
        btn.innerHTML = '<i class="bi bi-floppy-fill me-2"></i> Save Pricing';
    }
}



// ==========================================
// 🔄 ৮. Tab Switching Logic (SPA)
// ==========================================
window.switchTab = function (tabId, element) {
    // সব সেকশন হাইড করো
    document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');

    // শুধু সিলেক্ট করা সেকশন দেখাও
    document.getElementById(tabId + '-section').style.display = 'block';

    // সাইডবার মেন্যুর Active কালার চেঞ্জ করো
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    if (element) element.classList.add('active');

    // মোবাইলে সাইডবার ওপেন থাকলে তা বন্ধ করে দাও
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && sidebar.classList.contains('show')) {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
    }

    // ট্যাবে ঢুকলে ডেটা লোড করো
    if (tabId === 'coupons') loadAllCoupons();
    if (tabId === 'directory') populateFullDirectory();
};

// ==========================================
// 🎟️ ৯. Load All Coupons
// ==========================================
async function loadAllCoupons() {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/coupons`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await res.json();

        const tbody = document.querySelector('#coupons-table tbody');
        tbody.innerHTML = '';

        if (data.success && data.data.length > 0) {
            data.data.forEach(c => {
                tbody.innerHTML += `
                    <tr>
                        <td class="fw-bold text-primary">${c.code}</td>
                        <td class="fw-bold">${c.discountAmount}</td>
                        <td><span class="badge bg-secondary">${c.discountType.toUpperCase()}</span></td>
                        <td class="text-end"><span class="badge bg-${c.isActive ? 'success' : 'danger'}">${c.isActive ? 'Active' : 'Disabled'}</span></td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No coupons found.</td></tr>';
        }
    } catch (error) { console.error(error); }
}

// Full Directory Table (Overview এর ডেটাই এখানে কপি করা হবে)
window.populateFullDirectory = function () {
    const mainTableHTML = document.querySelector('.table tbody').innerHTML;
    document.querySelector('#full-directory-table tbody').innerHTML = mainTableHTML;
}

// ==========================================
// 🚀 Page Router (কোন পেজে কোন ডেটা লোড হবে)
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

    // ১. Dashboard Overview পেজ
    if (path.includes('dashboard.html') || path.endsWith('/admin/')) {
        if (document.getElementById('admin-price-month')) await loadPricing();
        loadDashboardData();

        // 🚀 ম্যাজিক: ড্রপডাউনে ডায়নামিক মাস (Jan, Feb) অ্যাড করা হচ্ছে
        const filterEl = document.getElementById('chart-filter');
        if (filterEl) {
            filterEl.innerHTML = `
                <option value="1m">Last 30 Days</option>
                <option value="6m" selected>Last 6 Months</option>
                <option value="1y">Last 1 Year</option>
                <optgroup label="Monthly Report" id="specific-months-group"></optgroup>
            `;
            const optGroup = document.getElementById('specific-months-group');
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            
            for (let i = 0; i < 6; i++) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // যেমন: 2026-03
                const label = i === 0 ? `This Month (${monthNames[d.getMonth()]})` : `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
                optGroup.innerHTML += `<option value="${val}">${label}</option>`;
            }
        }

        loadChartData(); 
    }
    // ২. Mess Directory পেজ
    else if (path.includes('directory.html')) {
        loadDirectoryData();
    }
    // ৩. Coupons & Promos পেজ
    else if (path.includes('coupons.html')) {
        loadAllCoupons();
        const couponBtn = document.querySelector('.bg-indigo-50 button');
        if (couponBtn) couponBtn.addEventListener('click', window.createCoupon);
    }
    // ৪. Transactions পেজ
    else if (path.includes('transactions.html')) {
        loadTransactionsData();
    }
});

// ==========================================
// 🏢 Mess Directory ডেটা লোড করা (আপডেটেড ডিজাইন)
// ==========================================
async function loadDirectoryData() {
    const tbody = document.querySelector('#full-directory-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5"><span class="spinner-border text-primary"></span><div class="mt-2 text-muted small">Loading directory...</div></td></tr>';

    try {
        const res = await fetch(`${API_BASE_URL}/admin/messes`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await res.json();

        tbody.innerHTML = '';
        if (data.success && data.data.length > 0) {
            data.data.reverse().forEach(mess => {
                const isFreeMode = mess.subscriptionStatus === 'active' && !mess.trialEndsAt;
                const isPremium = mess.subscriptionStatus === 'active' && mess.trialEndsAt;
                const isTrial = mess.subscriptionStatus === 'trial';
                const joinDate = new Date(mess.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                let statusBadge = '';
                let expiryText = '';
                let isBlocked = false;

                // 🚀 স্ট্যাটাস এবং নতুন মেয়াদ হিসাব করা হচ্ছে
                if (isFreeMode) {
                    statusBadge = `<span class="badge bg-info bg-opacity-10 text-info border border-info px-2 py-1">Free Lifetime</span>`;
                    expiryText = `Unlimited Access`;
                }
                else if (isPremium) {
                    statusBadge = `<span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1">Premium Pro</span>`;
                    expiryText = `${formatRemainingTime(mess.trialEndsAt)} Left`;
                }
                else if (isTrial) {
                    let diffDays = Math.ceil((new Date(mess.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
                    if (diffDays > 0) {
                        statusBadge = `<span class="badge bg-warning bg-opacity-10 text-dark px-2 py-1 border border-warning">Trial Active</span>`;
                        expiryText = `${formatRemainingTime(mess.trialEndsAt)} Left`;
                    } else {
                        isBlocked = true;
                        statusBadge = `<span class="badge bg-danger bg-opacity-10 text-danger px-2 py-1 border border-danger">Expired</span>`;
                        expiryText = `Access Locked`;
                    }
                }

                let actionBtn = isBlocked
                    ? `<button class="btn btn-action btn-success shadow-sm" onclick="unblockMessSub('${mess._id}', '${mess.messName}')">Unblock</button>`
                    : `<button class="btn btn-action btn-outline-danger shadow-sm" onclick="cancelMessSub('${mess._id}', '${mess.messName}')">Block / Cancel</button>`;

                tbody.innerHTML += `
                    <tr>
                        <td>
                            <div class="fw-bold text-dark">${mess.messName}</div>
                            <div class="small text-muted">Joined: ${joinDate}</div>
                        </td>
                        <td>
                            <div>${mess.messEmail}</div>
                            <div class="small text-muted">ID: ${mess._id.slice(-6).toUpperCase()}</div>
                        </td>
                        <td>
                            <div>${statusBadge}</div>
                            <div class="small text-muted mt-1" style="font-size: 0.75rem;"><i class="bi bi-clock-history me-1"></i>${expiryText}</div>
                        </td>
                        <td class="text-end">${actionBtn}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-5">কোনো মেস পাওয়া যায়নি।</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-5">ডেটা লোড করতে সমস্যা হয়েছে! সার্ভার চেক করুন।</td></tr>';
    }
}

// ==========================================
// 🎟️ Coupons ডেটা লোড করা
// ==========================================
async function loadAllCoupons() {
    const tbody = document.querySelector('#coupons-table tbody');
    if (!tbody) return;

    // লোডিং স্পিনার
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5"><span class="spinner-border text-primary"></span><div class="mt-2 text-muted small">Loading coupons...</div></td></tr>';

    try {
        const res = await fetch(`${API_BASE_URL}/admin/coupons`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await res.json();

        tbody.innerHTML = '';
        if (data.success && data.data.length > 0) {
            data.data.forEach(c => {
                const discountIcon = c.discountType === 'percentage' ? '%' : '৳';
                tbody.innerHTML += `
                    <tr>
                        <td><div class="fw-bold text-primary" style="letter-spacing: 1px;">${c.code}</div></td>
                        <td><div class="fw-bolder text-dark fs-6">${c.discountAmount}${discountIcon}</div></td>
                        <td><span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary px-2 py-1">${c.discountType.toUpperCase()}</span></td>
                        <td class="text-end"><span class="badge bg-${c.isActive ? 'success' : 'danger'} shadow-sm px-2 py-1">${c.isActive ? 'Active' : 'Disabled'}</span></td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-5">কোনো কুপন তৈরি করা হয়নি।</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-5">ডেটা লোড করতে সমস্যা হয়েছে!</td></tr>';
    }
}

// ==========================================
// 💳 Transactions ডেটা লোড করা (Advanced Sales View)
// ==========================================
async function loadTransactionsData() {
    const tbody = document.querySelector('#transactions-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5"><span class="spinner-border text-primary"></span><div class="mt-2 text-muted small">Loading sales data...</div></td></tr>';

    try {
        const res = await fetch(`${API_BASE_URL}/admin/transactions`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await res.json();

        tbody.innerHTML = '';
        if (data.success && data.data.length > 0) {
            data.data.forEach(trx => {
                const dateObj = new Date(trx.date);
                // 🚀 তারিখ এবং সময় আলাদা করা হলো
                const date = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                const time = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                
                // 🚀 কোন প্যাকেজ কিনেছে তা বের করার লজিক
                const isYearly = trx.amount >= (currentMonthlyPrice * 2);
                const packageBadge = isYearly 
                    ? `<span class="badge bg-primary bg-opacity-10 text-primary border border-primary px-2 py-1"><i class="bi bi-calendar3"></i> 1 Year Plan</span>` 
                    : `<span class="badge bg-info bg-opacity-10 text-info border border-info px-2 py-1"><i class="bi bi-calendar-event"></i> 1 Month Plan</span>`;

                tbody.innerHTML += `
                    <tr>
                        <td>
                            <div class="fw-bold text-dark fs-6">${trx.messName}</div>
                            <div class="small text-primary mb-1">${trx.messEmail || ''}</div>
                            <div class="text-muted small" style="font-family: monospace;">TrxID: <span class="fw-bold text-dark">${trx.trxId}</span></div>
                        </td>
                        <td>${packageBadge}</td>
                        <td><div class="fw-bolder text-success fs-5">৳${trx.amount}</div></td>
                        <td>
                            <div class="fw-bold text-secondary">${date}</div>
                            <div class="small text-muted"><i class="bi bi-clock"></i> ${time}</div>
                        </td>
                        <td class="text-end">
                            <span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1"><i class="bi bi-check-circle-fill"></i> ${trx.status}</span>
                        </td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-5"><i class="bi bi-receipt fs-1 d-block mb-2 opacity-50"></i>No transaction data available yet.</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-5">Error loading transactions!</td></tr>';
    }
}

// কুপন তৈরি করা
window.createCoupon = async function (e) {
    e.preventDefault();
    const btn = e.target;
    const code = document.getElementById('coupon-code').value.trim();
    const amount = document.getElementById('coupon-amount').value;
    const type = document.getElementById('coupon-type').value;
    const limit = document.getElementById('coupon-limit').value;
    const expiry = document.getElementById('coupon-expiry').value;

    if (!code || !amount || !limit || !expiry) {
        Swal.fire('Error', 'Please fill all coupon fields.', 'error');
        return;
    }

    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generating...';
    try {
        const res = await fetch(`${API_BASE_URL}/admin/coupons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ code, discountAmount: amount, discountType: type, usageLimit: limit, expiresAt: expiry })
        });
        const data = await res.json();
        if (data.success) {
            Swal.fire('Created!', data.message, 'success');
            document.getElementById('coupon-code').value = '';
            document.getElementById('coupon-amount').value = '';
            document.getElementById('coupon-limit').value = '';
            document.getElementById('coupon-expiry').value = '';
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Server connection failed', 'error');
    } finally {
        btn.innerHTML = '<i class="bi bi-plus-circle me-2"></i> Generate';
    }
};

// কুপন ডিলিট করা
window.deleteCoupon = async function (id) {
    const { isConfirmed } = await Swal.fire({
        title: 'Delete Coupon?',
        text: "This action cannot be undone.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Yes, Delete!'
    });

    if (isConfirmed) {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/coupons/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (res.ok) {
                Swal.fire('Deleted!', 'Coupon has been removed.', 'success');
                loadAllCoupons(); // লিস্ট রিলোড
            }
        } catch (e) {
            Swal.fire('Error', 'Failed to delete coupon', 'error');
        }
    }
};

// কুপন লিস্ট রেন্ডার (টেবিল আপডেট)
async function loadAllCoupons() {
    const tbody = document.querySelector('#coupons-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5"><span class="spinner-border text-primary"></span></td></tr>';

    try {
        const res = await fetch(`${API_BASE_URL}/admin/coupons`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
        const data = await res.json();

        tbody.innerHTML = '';
        if (data.success && data.data.length > 0) {
            data.data.forEach(c => {
                const discountIcon = c.discountType === 'percentage' ? '%' : '৳';
                const expiryDate = new Date(c.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                const isExpired = new Date() > new Date(c.expiresAt);
                const isLimitReached = c.usedCount >= c.usageLimit;

                let statusHtml = `<span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1">Active</span>`;
                if (isExpired) statusHtml = `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger px-2 py-1">Expired</span>`;
                else if (isLimitReached) statusHtml = `<span class="badge bg-warning bg-opacity-10 text-dark border border-warning px-2 py-1">Limit Reached</span>`;

                tbody.innerHTML += `
                    <tr>
                        <td><div class="fw-bold text-primary" style="letter-spacing: 1px;">${c.code}</div></td>
                        <td><div class="fw-bolder text-dark fs-6">${c.discountAmount}${discountIcon}</div></td>
                        <td><div class="text-muted small">${c.usedCount} / ${c.usageLimit} Used</div></td>
                        <td><div class="text-muted small">${expiryDate}</div></td>
                        <td>${statusHtml}</td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteCoupon('${c._id}')"><i class="bi bi-trash3-fill"></i></button>
                        </td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5">No coupons available.</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-5">Error loading data.</td></tr>';
    }
}

// ==========================================
// 📈 Chart.js: রেভিনিউ এবং গ্রোথ চার্ট রেন্ডার করা
// ==========================================
let analyticsChartInstance = null;

async function loadChartData() {
    const filterEl = document.getElementById('chart-filter');
    const range = filterEl ? filterEl.value : '6m'; 

    try {
        const res = await fetch(`${API_BASE_URL}/admin/analytics-chart?range=${range}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await res.json();

        if (data.success) {
            // 🚀 ম্যাজিক: রেভিনিউ এবং নতুন মেসের টোটাল নাম্বার যোগ করা হচ্ছে
            const totalRev = data.revenueData.reduce((a, b) => a + b, 0);
            const totalMesses = data.messesData.reduce((a, b) => a + b, 0);

            // UI তে সংখ্যাগুলো বসিয়ে দেওয়া
            const revEl = document.getElementById('chart-total-revenue');
            const messesEl = document.getElementById('chart-total-messes');
            if(revEl) revEl.innerText = `৳${totalRev}`;
            if(messesEl) messesEl.innerText = totalMesses;

            renderChart(data.labels, data.revenueData, data.messesData);
        }
    } catch (error) {
        console.error('Error loading chart data', error);
    }
}

function renderChart(labels, revenueData, messesData) {
    const ctx = document.getElementById('analyticsChart');
    if (!ctx) return;

    if (analyticsChartInstance) {
        analyticsChartInstance.destroy(); // পুরনো গ্রাফ মুছে নতুন গ্রাফ আঁকবে
    }

    analyticsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Revenue (৳)',
                    data: revenueData,
                    borderColor: '#10b981', // সবুজ
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'New Registrations',
                    data: messesData,
                    borderColor: '#6366f1', // নীল
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: {
                    type: 'linear', display: true, position: 'left',
                    title: { display: true, text: 'Revenue (৳)' }
                },
                y1: {
                    type: 'linear', display: true, position: 'right',
                    title: { display: true, text: 'New Messes' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

// ==========================================
// 📢 গ্লোবাল নোটিশ বোর্ড (Send & Load)
// ==========================================
window.sendGlobalNotice = async function () {
    const notice = document.getElementById('global-notice-input').value.trim();
    const btn = document.querySelector('button[onclick="sendGlobalNotice()"]');

    // নোটিশ মুছতে চাইলে ইনপুট ফাঁকা রেখে সেন্ড করতে হবে
    const actionText = notice ? 'publish this notice' : 'remove the current notice';

    const { isConfirmed } = await Swal.fire({
        title: 'Are you sure?',
        text: `Do you want to ${actionText} for all users?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'Yes, Send it!'
    });

    if (isConfirmed) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        try {
            const res = await fetch(`${API_BASE_URL}/admin/notice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
                body: JSON.stringify({ notice })
            });
            const data = await res.json();

            if (res.ok) {
                Swal.fire('Sent!', data.message, 'success');
                document.getElementById('current-notice-display').innerHTML = `Current Notice: <span class="fw-bold text-dark">${notice || '<span class="fst-italic text-muted">None (Hidden)</span>'}</span>`;
                document.getElementById('global-notice-input').value = '';
            } else {
                Swal.fire('Error', data.message, 'error');
            }
        } catch (e) {
            Swal.fire('Error', 'Server connection failed!', 'error');
        } finally {
            btn.innerHTML = '<i class="bi bi-send-fill"></i>';
        }
    }
};