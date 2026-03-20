const API_BASE_URL = 'https://meal-manager-backend-kp8y.onrender.com/api';

// 🛡️ Route Guard: টোকেন না থাকলে সরাসরি লগিন পেজে পাঠিয়ে দেবে
const adminToken = localStorage.getItem('superAdminToken');
if (!adminToken) {
    window.location.replace('index.html'); // লগিন পেজে রিডাইরেক্ট
}

let currentMonthlyPrice = 99; // ডিফল্ট প্রাইস

// ==========================================
// 📊 ১. ড্যাশবোর্ড লোড এবং ডেটা আনা
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();

    // কুপন ফর্ম সাবমিট ইভেন্ট
    const couponBtn = document.querySelector('.bg-indigo-50 button');
    if (couponBtn) {
        couponBtn.addEventListener('click', createCoupon);
    }
});

async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/messes`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
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

function updateAnalytics(messes) {
    const totalMesses = messes.length;
    const premiumMesses = messes.filter(m => m.subscriptionStatus === 'active' && m.trialEndsAt).length;
    const trialMesses = messes.filter(m => m.subscriptionStatus === 'trial').length;
    
    // 🚀 এখন আর ৯৯ নয়, ডাটাবেস থেকে আসা ডায়নামিক প্রাইস গুণ হবে
    const estimatedRevenue = premiumMesses * currentMonthlyPrice; 

    document.querySelectorAll('.stat-value')[0].innerText = totalMesses;
    document.querySelectorAll('.stat-value')[1].innerText = premiumMesses;
    document.querySelectorAll('.stat-value')[2].innerText = trialMesses;
    document.querySelectorAll('.stat-value')[3].innerText = `৳${estimatedRevenue}`;
}

// ==========================================
// 📋 ২. মেস লিস্ট (টেবিল) রেন্ডার করা
// ==========================================
function renderMessTable(messes) {
    const tbody = document.querySelector('.table tbody');
    tbody.innerHTML = '';

    if (messes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">কোনো মেস পাওয়া যায়নি।</td></tr>';
        return;
    }

    messes.reverse().forEach(mess => {
        const isTrial = mess.subscriptionStatus === 'trial';
        const isFreeMode = mess.subscriptionStatus === 'active' && !mess.trialEndsAt; 
        const isPremium = mess.subscriptionStatus === 'active' && mess.trialEndsAt; 
        
        const joinDate = new Date(mess.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        
        let statusBadge = '';
        let isBlocked = false; // 🚀 ব্লক চেক করার ভেরিয়েবল

        if (isFreeMode) {
            statusBadge = `<span class="badge bg-info bg-opacity-10 text-info border border-info px-2 py-1">Free Lifetime</span>`;
        } else if (isPremium) {
            statusBadge = `<span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1">Premium Pro</span>`;
        } else if (isTrial) {
            let daysLeft = 'Expired';
            if (mess.trialEndsAt) {
                const diffDays = Math.ceil((new Date(mess.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
                if (diffDays > 0) {
                    daysLeft = `${diffDays} Days Left`;
                } else {
                    isBlocked = true; // সময় শেষ মানে সে ব্লকড বা লকড!
                }
            }
            statusBadge = `<span class="badge ${isBlocked ? 'bg-danger text-white' : 'bg-warning text-dark'} bg-opacity-10 border border-${isBlocked ? 'danger' : 'warning'} px-2 py-1">Trial (${daysLeft})</span>`;
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
                <td>${statusBadge}</td>
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

window.toggleMagicSwitch = async function(checkbox) {
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
window.cancelMessSub = async function(id, name) {
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
window.unblockMessSub = async function(id, name) {
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
        if(data.success && data.data) {
            currentMonthlyPrice = data.data.monthlyPrice; // 🚀 গ্লোবাল ভেরিয়েবলে সেভ করা হলো
            document.getElementById('admin-price-month').value = data.data.monthlyPrice;
            document.getElementById('admin-price-year').value = data.data.yearlyPrice;
        }
    } catch(e) { console.error("Price Load Error", e); }
}

// 🚀 পেজ লোড ইভেন্ট চেইনিং
document.addEventListener('DOMContentLoaded', async () => {
    await loadPricing(); // আগে প্রাইস আনবে
    loadDashboardData(); // তারপর মেসের ডেটা এনে রেভিনিউ হিসাব করবে
});

window.updateAdminPricing = async function() {
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
        
        if(res.ok) Swal.fire('Saved!', 'Pricing has been updated globally.', 'success');
        else Swal.fire('Error', data.message, 'error');
    } catch(e) {
        Swal.fire('Error', 'Server connection failed!', 'error');
    } finally {
        btn.innerHTML = '<i class="bi bi-floppy-fill me-2"></i> Save Pricing';
    }
}

// 🚀 পেজ লোড হওয়ার সময় loadPricing() কল করার জন্য একদম ওপরের DOMContentLoaded এ এটি অ্যাড করুন
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    loadPricing(); // নতুন লাইন
});