// ==========================================
// --- AUTHENTICATION LOGIC (SECURE JWT SaaS) ---
// ==========================================

let isManager = localStorage.getItem('messToken') ? true : false;

function toggleLogin() {
    if (isManager) {
        handleLogout();
    } else {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            const emailInput = document.getElementById('mess-email');
            const pinInput = document.getElementById('manager-pin');
            if(emailInput) emailInput.value = '';
            if(pinInput) pinInput.value = '';
            
            new bootstrap.Modal(loginModal).show();
        } else {
            alert("দয়া করে লগিন পেজে যান!");
        }
    }
}

function applyAuthRules() {
    const authBtn = document.getElementById('btn-auth');
    const toggleContainer = document.getElementById('bazar-report-toggle-container'); 

    let styleTag = document.getElementById('auth-styles');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'auth-styles';
        document.head.appendChild(styleTag);
    }

    if (isManager) {
        if(authBtn) {
            authBtn.innerHTML = '<i class="bi bi-box-arrow-right"></i> Logout';
            authBtn.classList.replace('btn-warning', 'btn-danger');
        }
        
        styleTag.innerHTML = ``; 
        if(toggleContainer) toggleContainer.style.setProperty('display', 'flex', 'important');
        
    } else {
        if(authBtn) {
            authBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Manager Login';
            authBtn.classList.replace('btn-danger', 'btn-warning');
        }

        if(toggleContainer) toggleContainer.style.setProperty('display', 'none', 'important');

        styleTag.innerHTML = `
            div:has(> #global-start-date), div:has(> #global-end-date), button[onclick^="applyGlobalFilter"] { display: none !important; }
            div:has(> #select-manager), button[onclick="saveManager()"] { display: none !important; }
            [data-target="settings"], a[href="#settings"], li:has([data-target="settings"]) { display: none !important; }
            .col-12:has(button[onclick="triggerHandover()"]) { display: none !important; }
            #bazar-report-toggle-container { display: none !important; }
            .card:has(form), form { display: none !important; }
            table:not(:has(#table-low-balance)):not(:has(#table-balance)):not(:has(#table-report)):not(:has(#history-table-body)) th.text-end:last-child, 
            table:not(:has(#table-low-balance)):not(:has(#table-balance)):not(:has(#table-report)):not(:has(#history-table-body)) td.text-end:last-child { display: none !important; }
            button[onclick*="delete"], button[onclick*="Delete"], button[onclick*="clear"], button[onclick*="Clear"], button[onclick*="remove"], button[onclick^="openEdit"], button[onclick^="editShopperForDate"] { display: none !important; }
        `;
    }
}

// --- লগিন করার ফাংশন ---
window.handleLogin = async function(email, pin) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messEmail: email, managerPin: pin })
        });

        const data = await response.json();

        if (response.ok && data.token) {
            localStorage.setItem('messToken', data.token);
            localStorage.setItem('currentMessId', data.messId);
            localStorage.setItem('messName', data.messName);
            
            const loginModalEl = document.getElementById('loginModal');
            if(loginModalEl) {
                const modalInstance = bootstrap.Modal.getInstance(loginModalEl);
                if(modalInstance) modalInstance.hide();
            }

            Swal.fire({ icon: 'success', title: 'লগিন সফল!', showConfirmButton: false, timer: 1500 });
            
            setTimeout(() => {
                window.location.reload(); 
            }, 1500);
            
        } else {
            Swal.fire('লগিন ফেইল!', data.message || 'ইমেইল বা পিন ভুল হয়েছে।', 'error');
        }
    } catch (error) {
        console.error("Login Error:", error);
        Swal.fire('সার্ভার এরর!', 'ইন্টারনেট কানেকশন চেক করুন।', 'error');
    }
}

window.handleLogout = function() {
    Swal.fire({
        title: 'লগআউট করতে চান?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'হ্যাঁ, লগআউট করবো'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear(); 
            sessionStorage.clear();
            window.location.reload();
        }
    });
}

// ==========================================
// --- FORGOT PIN LOGIC (FOR DASHBOARD) ---
// ==========================================
window.openForgotPinModal = function () {
    const loginModalEl = document.getElementById('loginModal');
    if (loginModalEl) {
        const loginModal = bootstrap.Modal.getInstance(loginModalEl);
        if (loginModal) loginModal.hide();
    }
    resetForgotPinUI();
    const forgotModal = new bootstrap.Modal(document.getElementById('forgotPinModal'));
    forgotModal.show();
};

window.resetForgotPinUI = function () {
    document.getElementById('forgot-step-1').classList.remove('d-none');
    document.getElementById('forgot-step-2').classList.add('d-none');
    document.getElementById('forgot-email').value = '';
    document.getElementById('forgot-otp').value = '';
    document.getElementById('forgot-new-pin').value = '';
};

window.sendOtp = async function () {
    const email = document.getElementById('forgot-email').value;
    if (!email) return Swal.fire('Oops', 'দয়া করে আপনার ইমেইল দিন!', 'warning');

    const btn = document.getElementById('btn-send-otp');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/auth/forgot-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messEmail: email })
        });
        const data = await res.json();

        if (res.ok) {
            document.getElementById('forgot-step-1').classList.add('d-none');
            document.getElementById('forgot-step-2').classList.remove('d-none');
            document.getElementById('forgot-step-2').dataset.email = email;
        } else {
            Swal.fire('Error', data.message || 'OTP পাঠানো যায়নি!', 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'সার্ভারে কানেক্ট করা যাচ্ছে না!', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

window.verifyAndResetPin = async function () {
    const email = document.getElementById('forgot-step-2').dataset.email;
    const otp = document.getElementById('forgot-otp').value;
    const newPin = document.getElementById('forgot-new-pin').value;

    if (!otp || !newPin) return Swal.fire('Oops', 'OTP এবং নতুন পিন ঠিকমতো দিন!', 'warning');

    const btn = document.getElementById('btn-reset-pin');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verifying...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/auth/reset-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messEmail: email, otp, newPin })
        });
        const data = await res.json();

        if (res.ok) {
            Swal.fire('Success!', data.message, 'success').then(() => {
                const forgotModalEl = document.getElementById('forgotPinModal');
                const forgotModal = bootstrap.Modal.getInstance(forgotModalEl);
                if (forgotModal) forgotModal.hide();

                const mainPinInput = document.getElementById('manager-pin');
                if (mainPinInput) {
                    mainPinInput.value = newPin;
                }

                const loginModalEl = document.getElementById('loginModal');
                if (loginModalEl) {
                    const loginModal = new bootstrap.Modal(loginModalEl);
                    loginModal.show();
                }
            });
        } else {
            Swal.fire('Error', data.message || 'OTP ভুল বা মেয়াদ শেষ!', 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'সার্ভারে কানেক্ট করা যাচ্ছে না!', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};