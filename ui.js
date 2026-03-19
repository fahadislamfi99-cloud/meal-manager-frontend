// --- RESPONSIVE TABLE CSS FIX ---
if (!document.getElementById('responsive-table-fixes')) {
    const style = document.createElement('style');
    style.id = 'responsive-table-fixes';
    style.innerHTML = `
        @media (max-width: 767px) {
            table:has(#table-bazar) thead,
            table:has(#table-deposits) thead,
            table:has(#table-report) thead,
            table:has(#table-meal-history) thead,
            table:has(#table-members) thead,
            table:has(#table-balance) thead {
                display: none !important;
            }
        }
    `;
    document.head.appendChild(style);
}

// স্ক্রিনের সব জায়গায় প্রিমিয়াম লোডিং অ্যানিমেশন দেখানোর ফাংশন
function showLoadingSpinners() {
    // ১. ড্যাশবোর্ডের জন্য আসল Facebook/Netflix স্টাইলের Shimmer CSS অ্যাড করা
    if (!document.getElementById('premium-skeleton-style')) {
        const style = document.createElement('style');
        style.id = 'premium-skeleton-style';
        style.innerHTML = `
            .premium-shimmer {
                display: inline-block;
                width: 75px;
                height: 20px;
                border-radius: 50rem;
                background: #e2e8f0;
                background: linear-gradient(90deg, #e2e8f0 25%, #f8fafc 50%, #e2e8f0 75%);
                background-size: 200% 100%;
                animation: premiumShimmer 1.5s infinite;
                vertical-align: middle;
            }
            @keyframes premiumShimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // টেবিলের জন্য সুন্দর Pulse (Grow) অ্যানিমেশন
    const tableLoader = `<tr><td colspan="10" class="text-center py-5 border-0">
                            <div class="spinner-grow text-primary mb-3" role="status" style="width: 3rem; height: 3rem;"></div>
                            <h5 class="text-muted fw-bold mb-1">Fetching Data...</h5>
                            <small class="text-secondary">Please wait a moment while data is loading</small>
                         </td></tr>`;

    const divLoader = `<div class="text-center py-5">
                            <div class="spinner-grow text-primary mb-3" role="status" style="width: 3rem; height: 3rem;"></div>
                            <h5 class="text-muted fw-bold mb-1">Loading...</h5>
                       </div>`;

    // সব টেবিলের ভেতরে লোডিং দেখানো
    const tables = ['table-members', 'table-deposits', 'table-meal-history', 'table-bazar', 'table-report', 'table-balance', 'table-low-balance'];
    tables.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = tableLoader;
    });

    // অন্যান্য কন্টেইনারে লোডিং দেখানো
    const containers = ['today-meals-container', 'dashboard-today-meals-container', 'meal-member-list'];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = divLoader;
    });

    // ড্যাশবোর্ডের সংখ্যাগুলোর জন্য নতুন premium-shimmer ব্যবহার করা
    const skeletonLoader = `<span class="premium-shimmer ms-1"></span>`;

    const stats = ['stat-members', 'stat-meals', 'stat-expense', 'stat-rate', 'stat-deposit', 'stat-cash'];
    stats.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = skeletonLoader;
    });
}

// --- RENDERING ---
function renderAll() {
    renderDashboard(); renderMembersTable(); renderMealChecklist(); renderMealTables();
    renderBazarTable(); renderDeposits(); renderDepositSelect(); renderReportTable();
    renderManagerSelection(); renderBalanceTable(); renderLowBalanceAlert(); populateBazarShopper();
    populateSettingsForm();
}

function renderDashboard() {
    const activeMembers = state.members.filter(m => m.isActive).length;
    const totalExpense = state.report.totalExpense || 0;

    document.getElementById('stat-members').innerText = activeMembers;
    document.getElementById('stat-meals').innerText = state.report.totalMeals || 0;
    document.getElementById('stat-expense').innerText = totalExpense;
    document.getElementById('stat-rate').innerText = (state.report.mealRate || 0).toFixed(2);

    // ১. মোট জমা হিসাব করা
    const totalDeposited = state.deposits.reduce((sum, d) => sum + d.amount, 0);
    document.getElementById('stat-deposit').innerText = totalDeposited;

    // ২. ম্যানেজারের কাছে থাকা ব্যালেন্স হিসাব করা
    const cashInHand = totalDeposited - totalExpense;
    const cashEl = document.getElementById('stat-cash');
    const cashTitle = document.getElementById('title-cash');
    const cashTextContainer = document.getElementById('text-cash');
    const cashCard = document.getElementById('card-cash');

    // যদি ব্যালেন্স মাইনাস হয় (ম্যানেজার নিজের পকেট থেকে খরচ করেছেন)
    if (cashInHand < 0) {
        cashEl.innerText = Math.abs(cashInHand); // মাইনাস চিহ্ন না দেখিয়ে পজিটিভ দেখাবে
        cashTitle.innerText = "Manager's Due (ম্যানেজার পাবে)";
        cashTitle.className = "text-danger mb-1 fw-bold";
        cashTextContainer.className = "mb-0 text-danger";
        cashCard.classList.replace('border-dark', 'border-danger');
        cashCard.classList.replace('border-success', 'border-danger');
    }
    // যদি ব্যালেন্স প্লাস হয় (ম্যানেজারের হাতে টাকা আছে)
    else {
        cashEl.innerText = cashInHand;
        cashTitle.innerText = "Cash in Hand (ক্যাশ আছে)";
        cashTitle.className = "text-success mb-1 fw-bold";
        cashTextContainer.className = "mb-0 text-success";
        cashCard.classList.replace('border-dark', 'border-success');
        cashCard.classList.replace('border-danger', 'border-success');
    }
}

function renderMembersTable() {
    const tbody = document.getElementById('table-members');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (state.members.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No members found. Add a new member.</td></tr>`;
        return;
    }

    state.members.forEach(member => {
        const tr = document.createElement('tr');

        // ম্যাজিক: নম্বর থাকলে সুন্দর হোয়াটসঅ্যাপ আইকন দেখাবে, না থাকলে "No Number" দেখাবে
        const phoneDisplay = member.phone
            ? `<div class="text-muted small mt-1"><i class="bi bi-whatsapp text-success me-1"></i>${member.phone}</div>`
            : `<div class="text-muted small mt-1 opacity-50"><i class="bi bi-telephone-x me-1"></i>No Number</div>`;

        tr.innerHTML = `
            <td class="align-middle">
                <div class="fw-bold text-dark">${member.name}</div>
                ${phoneDisplay} </td>
            <td class="align-middle text-muted">${member.room}</td>
            <td class="align-middle">
                <span class="badge ${member.isActive ? 'bg-success' : 'bg-danger'}">
                    ${member.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td class="align-middle text-end text-nowrap">
                <button onclick="openEditMemberModal(this, '${member._id}', '${member.name}', '${member.room}', '${member.phone || ''}')" class="btn btn-sm btn-outline-primary me-1" title="Edit"><i class="bi bi-pencil"></i></button>
                <button onclick="deleteMember('${member._id}')" class="btn btn-sm btn-outline-danger" title="Delete"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderDeposits() {
    const tbody = document.getElementById('table-deposits') || document.getElementById('table-deposit');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (state.deposits.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-5"><i class="bi bi-clock-history fs-1 text-light d-block mb-2"></i>No deposit history found.</td></tr>`;
        return;
    }

    // ১. সব ডিপোজিটকে লেটেস্ট থেকে পুরনো (Chronological) সিরিয়ালে সাজানো
    const sortedDeposits = [...state.deposits].sort((a, b) => {
        const dateDiff = new Date(b.date) - new Date(a.date);
        if (dateDiff !== 0) return dateDiff;
        return String(b._id).localeCompare(String(a._id));
    });

    sortedDeposits.forEach(entry => {
        const dateObj = new Date(entry.date);
        const niceDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'short' });

        const memberId = entry.member._id || entry.member;
        const memberObj = state.members.find(m => m._id === memberId);
        const memberName = memberObj ? memberObj.name : 'Unknown';
        const roomNum = memberObj ? memberObj.room : 'N/A';

        const isRefund = entry.amount < 0;

        // ২. প্রফেশনাল ব্যাজ (Badge) ডিজাইন
        const typeBadge = isRefund
            ? `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1 mt-1"><i class="bi bi-arrow-return-left me-1"></i>Refund</span>`
            : `<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 mt-1"><i class="bi bi-cash me-1"></i>Cash In</span>`;

        const amountColor = isRefund ? 'text-danger' : 'text-success';
        const displayAmount = isRefund ? `- ৳${Math.abs(entry.amount)}` : `+ ৳${entry.amount}`;

        // ৩. পারফেক্ট এলাইনমেন্ট সহ টেবিল রেন্ডার
        tbody.innerHTML += `
            <tr class="align-middle border-bottom border-light">
                <td class="ps-3 ps-md-4 text-nowrap" style="width: 1%;">
                    <div class="fw-bold text-dark" style="font-size: 0.95rem;">${niceDate}</div>
                    <div class="text-secondary small">${dayName}</div>
                </td>
                
                <td class="w-100 text-wrap">
                    <div class="fw-bold text-dark fs-6">${memberName} <span class="text-muted fw-normal small ms-1">(${roomNum})</span></div>
                    ${typeBadge}
                </td>
                
                <td class="text-end fw-bold ${amountColor} text-nowrap" style="width: 1%; padding-right: 20px; font-size: 1.1rem;">
                    ${displayAmount}
                </td>
                
                <td class="text-end pe-3 pe-md-4" style="width: 1%;">
                    <button onclick="deleteDeposit('${entry._id}')" class="btn btn-sm btn-light text-danger border shadow-sm p-1" title="Delete">
                        <i class="bi bi-trash" style="font-size: 0.9rem;"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function renderMealChecklist() {
    const container = document.getElementById('meal-member-list');
    if (!container) return;
    container.innerHTML = '';

    const activeMembers = state.members.filter(m => m.isActive);
    if (activeMembers.length === 0) {
        container.innerHTML = `<p class="text-muted mb-0">No active members found.</p>`;
        return;
    }

    // --- নতুন: Select All অপশন তৈরি করা ---
    const selectAllDiv = document.createElement('div');
    selectAllDiv.className = 'form-check mb-3 border-bottom pb-2';
    selectAllDiv.innerHTML = `
        <input class="form-check-input border-primary" type="checkbox" id="meal-select-all">
        <label class="form-check-label w-100 cursor-pointer fw-bold text-primary" for="meal-select-all">
            Select All Members
        </label>
    `;
    container.appendChild(selectAllDiv);

    // --- সাধারণ মেম্বারদের লিস্ট তৈরি করা ---
    activeMembers.forEach(member => {
        const div = document.createElement('div');
        div.className = 'form-check mb-2';
        div.innerHTML = `
            <input class="form-check-input meal-checkbox" type="checkbox" value="${member._id}" id="meal-mem-${member._id}">
            <label class="form-check-label w-100 cursor-pointer" for="meal-mem-${member._id}">
                ${member.name} <span class="text-muted small">(${member.room})</span>
            </label>
        `;
        container.appendChild(div);
    });

    const checkboxes = document.querySelectorAll('.meal-checkbox');
    const selectAllCheckbox = document.getElementById('meal-select-all');

    // কাউন্ট আপডেট করার ফাংশন
    const updateCount = () => {
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        document.getElementById('meal-count-preview').innerText = checkedCount;

        // যদি সবাই সিলেক্টেড থাকে, তবে Select All বক্সে অটোমেটিক টিক পড়বে
        if (checkedCount === checkboxes.length && checkboxes.length > 0) {
            selectAllCheckbox.checked = true;
        } else {
            selectAllCheckbox.checked = false;
        }
    };

    // --- নতুন: Select All বাটনে ক্লিক করার লজিক ---
    selectAllCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        checkboxes.forEach(cb => {
            cb.checked = isChecked;
        });
        updateCount(); // কাউন্ট আপডেট হবে
    });

    // প্রতিটি মেম্বারের চেকবক্সে ক্লিক করলে কাউন্ট আপডেট হবে
    checkboxes.forEach(cb => cb.addEventListener('change', updateCount));

    updateCount(); // শুরুতে কাউন্ট ০ দেখানোর জন্য
}

function renderMealTables() {
    const todayContainer = document.getElementById('today-meals-container');
    const dashboardTodayContainer = document.getElementById('dashboard-today-meals-container');
    const historyBody = document.getElementById('table-meal-history');

    if (todayContainer) todayContainer.innerHTML = '';
    if (dashboardTodayContainer) dashboardTodayContainer.innerHTML = '';
    if (historyBody) historyBody.innerHTML = '';

    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now.getTime() - offset)).toISOString().split('T')[0];

    const todaysMeals = state.meals.filter(meal => meal.date.startsWith(localISOTime));
    const previousMeals = state.meals;

    // ==========================================
    // ৩. Today's Meals টেবিল (অপরিবর্তিত)
    // ==========================================
    const groupedTodaysMeals = {};
    todaysMeals.forEach(meal => {
        if (!groupedTodaysMeals[meal.mealType]) {
            groupedTodaysMeals[meal.mealType] = { type: meal.mealType, memberIds: [] };
        }
        const ids = meal.members.map(m => m._id || m);
        groupedTodaysMeals[meal.mealType].memberIds.push(...ids);
    });

    const mealOrder = ["Sehri", "Breakfast", "Lunch", "Iftar", "Dinner"];
    const sortedMealTypes = Object.keys(groupedTodaysMeals).sort((a, b) => {
        let indexA = mealOrder.indexOf(a);
        let indexB = mealOrder.indexOf(b);
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;
        return indexA - indexB;
    });

    let todayTableHTML = '';

    if (todaysMeals.length === 0) {
        todayTableHTML = `<p class="text-center text-muted mb-0">আজকের জন্য এখনও কোনো মিল এন্ট্রি করা হয়নি।</p>`;
    } else {
        const membersWithActiveMeals = state.members
            .filter(m => m.isActive)
            .filter(member => {
                return todaysMeals.some(meal =>
                    meal.members.some(m => (m._id || m) === member._id)
                );
            })
            .sort((a, b) => String(a.room).localeCompare(String(b.room), undefined, { numeric: true }));

        todayTableHTML = `
            <div class="table-responsive">
                <table class="table table-bordered align-middle text-center bg-white mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>ক্র.নং</th>
                            <th class="text-start">নাম</th>
                            <th>রুম</th>
        `;

        sortedMealTypes.forEach(type => {
            todayTableHTML += `<th class="text-primary text-uppercase">${type}</th>`;
        });

        todayTableHTML += `</tr></thead><tbody>`;

        membersWithActiveMeals.forEach((member, index) => {
            todayTableHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td class="text-start fw-bold">${member.name}</td>
                    <td class="text-muted">${member.room}</td>
            `;

            sortedMealTypes.forEach(type => {
                const mealCount = groupedTodaysMeals[type].memberIds.filter(id => id === member._id).length;

                if (mealCount > 0) {
                    const checkMarks = '✅'.repeat(mealCount);
                    todayTableHTML += `<td><span class="text-success" style="font-size: 1.2rem; letter-spacing: 2px;">${checkMarks}</span></td>`;
                } else {
                    todayTableHTML += `<td><span class="text-danger" style="font-size: 1.2rem;">❌</span></td>`;
                }
            });

            todayTableHTML += `</tr>`;
        });

        todayTableHTML += `</tbody></table></div>`;

        if (todayContainer) {
            todayTableHTML += `<p class="text-muted small mt-2 text-end">* মিল এডিট বা ডিলিট করতে নিচে Meal History সেকশন ব্যবহার করুন।</p>`;
        }
    }

    if (todayContainer) todayContainer.innerHTML = todayTableHTML;
    if (dashboardTodayContainer) dashboardTodayContainer.innerHTML = todayTableHTML;

    // ==========================================
    // ৪. Previous Meals (History) রেন্ডার করা (আপডেটেড উইথ প্যাজিনেশন)
    // ==========================================
    if (!historyBody) return;

    if (previousMeals.length === 0) {
        historyBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">এই মাসে কোনো আগের মিল খুঁজে পাওয়া যায়নি।</td></tr>`;
    } else {
        const groupedPreviousMeals = {};
        previousMeals.forEach(meal => {
            const dateStr = meal.date.split('T')[0];
            if (!groupedPreviousMeals[dateStr]) {
                groupedPreviousMeals[dateStr] = [];
            }
            groupedPreviousMeals[dateStr].push(meal);
        });

        const sortedDates = Object.keys(groupedPreviousMeals).sort((a, b) => new Date(b) - new Date(a));

        // ম্যাজিক: সব ডেটার বদলে শুধু লিমিট অনুযায়ী ডেটা নেওয়া হচ্ছে
        const datesToShow = sortedDates.slice(0, visibleMealLimit);

        datesToShow.forEach(dateStr => {
            const dateObj = new Date(dateStr);
            const niceDate = dateObj.toLocaleDateString('en-GB');
            const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'short' });

            const mealsOnDate = groupedPreviousMeals[dateStr];
            const dayTotalMeals = mealsOnDate.reduce((sum, currentMeal) => sum + currentMeal.totalMeals, 0);

            const dailyBazars = state.bazar.filter(b => b.date.startsWith(dateStr));
            const dailyExpense = dailyBazars.reduce((sum, b) => sum + b.amount, 0);
            const dailyRate = dayTotalMeals > 0 ? (dailyExpense / dayTotalMeals) : 0;

            mealsOnDate.sort((a, b) => {
                let indexA = mealOrder.indexOf(a.mealType);
                let indexB = mealOrder.indexOf(b.mealType);
                if (indexA === -1) indexA = 999;
                if (indexB === -1) indexB = 999;
                return indexA - indexB;
            });

            // তারিখের হেডার (মোবাইল ও ডেস্কটপ উভয়ের জন্য রেস্পন্সিভ)
            historyBody.innerHTML += `
                <tr class="table-light border-bottom border-secondary">
                    <td colspan="5" class="pb-2 pt-3 px-3">
                        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
                            <div class="fw-bold text-dark mb-2 mb-md-0 d-flex flex-wrap align-items-center gap-2 mt-1">
                                <span><i class="bi bi-calendar-event text-primary me-1"></i>${niceDate} <span class="text-muted small">(${dayName})</span></span>
                                <div>
                                    <span class="badge bg-danger bg-opacity-10 text-danger border border-danger" title="Total Expense of this day">Expense: ৳${dailyExpense}</span>
                                    <span class="badge bg-warning bg-opacity-25 text-dark border border-warning" title="Meal Rate of this day">Rate: ৳${dailyRate.toFixed(2)}</span>
                                </div>
                            </div>
                            <div class="fw-bold text-primary mt-2 mt-md-0">Total Meals: ${dayTotalMeals}</div>
                        </div>
                    </td>
                </tr>
            `;

            mealsOnDate.forEach(meal => {
                const memberNames = meal.members.map(m => {
                    const found = state.members.find(sm => sm._id === (m._id || m));
                    return found ? `${found.name} (${found.room})` : 'Unknown';
                }).join(', ');

                historyBody.innerHTML += `
                    <tr class="d-none d-md-table-row">
                        <td class="text-muted small ps-4 border-0">↳</td>
                        <td class="text-secondary fw-bold border-0">${meal.mealType}</td>
                        <td class="small text-muted border-0" style="max-width: 300px;">${memberNames}</td>
                        <td class="border-0"><span class="badge bg-secondary">${meal.totalMeals}</span></td>
                        <td class="text-end border-0" style="min-width: 90px;">
                            <button onclick="openEditMealModal(this, '${meal._id}')" class="btn btn-sm btn-outline-primary me-1" title="Edit Meal">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button onclick="deleteMeal('${meal._id}')" class="btn btn-sm btn-outline-danger" title="Delete Meal">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                    
                    <tr class="d-md-none border-bottom">
                        <td colspan="5" class="border-0 p-3 bg-white">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="text-primary fw-bold fs-6">${meal.mealType}</span>
                                <span class="badge bg-secondary rounded-pill">Total: ${meal.totalMeals}</span>
                            </div>
                            <div class="small text-muted mb-3 lh-base" style="word-break: break-word;">
                                <span class="fw-bold text-dark me-1">Members:</span>${memberNames}
                            </div>
                            <div class="text-end">
                                <button onclick="openEditMealModal(this, '${meal._id}')" class="btn btn-sm btn-outline-primary me-2 px-3">
                                    <i class="bi bi-pencil"></i> Edit
                                </button>
                                <button onclick="deleteMeal('${meal._id}')" class="btn btn-sm btn-outline-danger px-3">
                                    <i class="bi bi-trash"></i> Delete
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        });

        // --- Load More Button (Meal) ---
        if (sortedDates.length > visibleMealLimit) {
            historyBody.innerHTML += `
                <tr>
                    <td colspan="5" class="text-center py-3 border-0 bg-white">
                        <button onclick="loadMoreMeals()" class="btn btn-outline-primary btn-sm rounded-pill px-4 shadow-sm">
                            <i class="bi bi-arrow-down-circle me-1"></i> Load More
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

function renderBazarTable() {
    const tbody = document.getElementById('table-bazar');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (state.bazar.length === 0) {
        // ম্যাজিক: কলাম ৫ থেকে ৪ করা হয়েছে
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-5"><i class="bi bi-cart-x fs-1 text-light d-block mb-2"></i>No bazar entries found.</td></tr>`;
        return;
    }

    const groupedBazar = {};
    state.bazar.forEach(entry => {
        const dateStr = new Date(entry.date).toISOString().split('T')[0];
        if (!groupedBazar[dateStr]) groupedBazar[dateStr] = [];
        groupedBazar[dateStr].push(entry);
    });

    // ==========================================
    // --- ম্যাজিক ১: লেটেস্ট ও পুরনো ডেটা রিডিং (Fix) ---
    // ==========================================
    const shopperDates = {};
    Object.keys(groupedBazar).forEach(date => {
        const items = groupedBazar[date];
        let name = '';

        // ১. নতুন প্রফেশনাল সিস্টেম চেক
        const newShopperItem = items.find(i => i.shopper && typeof i.shopper === 'object' && i.shopper.name);
        if (newShopperItem) {
            name = newShopperItem.shopper.name;
        }
        // ২. পুরনো নোট থেকে নাম বের করা (Smart Regex Fix)
        else {
            const oldShopperItem = items.find(i => i.note && i.note.includes('বাজারকারী'));
            if (oldShopperItem) {
                // স্পেস বা কোলন যাই থাকুক, নিখুঁতভাবে নাম বের করে আনবে
                name = oldShopperItem.note.replace(/বাজারকারী\s*:?/g, '').split(',')[0].trim();
            }
        }

        if (name) {
            if (!shopperDates[name]) shopperDates[name] = [];
            shopperDates[name].push(date);
        }
    });


    let summaryCards = '';
    for (const [name, datesArray] of Object.entries(shopperDates)) {
        const count = datesArray.length;
        const memberObj = state.members.find(m => m.name === name);
        const roomNum = memberObj ? memberObj.room : 'N/A';
        const datesJson = encodeURIComponent(JSON.stringify(datesArray));

        summaryCards += `
            <div onclick="showShopperDates('${name}', '${datesJson}')" title="Click to see dates" class="d-inline-flex align-items-center bg-white border rounded-pill shadow-sm me-2 mb-2 pe-3 ps-1 py-1" style="transition: all 0.3s ease; cursor: pointer;" onmouseover="this.classList.add('bg-light', 'border-primary')" onmouseout="this.classList.remove('bg-light', 'border-primary')">
                <div class="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center fw-bold shadow-sm" style="width: 32px; height: 32px; font-size: 0.95rem;">${count}</div>
                <div class="ms-2 text-start">
                    <div class="fw-bold text-dark lh-1 mt-1" style="font-size: 0.9rem;">${name}</div>
                    <div class="text-muted small lh-1 mt-1" style="font-size: 0.7rem;"><i class="bi bi-door-closed"></i> Rm: ${roomNum}</div>
                </div>
            </div>
        `;
    }

    // যারা বাজার করেনি তাদের লিস্ট তৈরি করা
    let nonShopperCards = '';
    
    if (state.report && state.report.members) {
        const culprits = state.report.members.filter(m => 
            m.totalMeals > 0 && 
            !m.isManager && 
            !shopperDates[m.name]
        );

        if (culprits.length > 0) {
            nonShopperCards += `<div class="mt-4 pt-3 border-top border-danger border-opacity-25">`;
            nonShopperCards += `<div class="text-danger fw-bold mb-3 d-flex align-items-center" style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;"><i class="bi bi-exclamation-octagon-fill fs-5 me-2"></i> Non-Shoppers (বাজার করেনি)</div>`;
            nonShopperCards += `<div class="d-flex flex-wrap gap-2">`;
            culprits.forEach(c => {
                nonShopperCards += `
                    <div class="d-inline-flex align-items-center bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded-pill px-3 py-1 text-danger shadow-sm">
                        <i class="bi bi-person-x-fill me-2"></i> <span class="fw-bold" style="font-size: 0.85rem;">${c.name}</span> <span class="ms-1 small opacity-75">(${c.room})</span>
                    </div>
                `;
            });
            nonShopperCards += `</div></div>`;
        } else if (summaryCards !== '') {
             nonShopperCards += `<div class="mt-4 pt-3 border-top border-success border-opacity-25 text-success fw-bold d-flex align-items-center" style="font-size: 0.85rem;"><i class="bi bi-check-circle-fill fs-5 me-2"></i> সবাই বাজার করেছে!</div>`;
        }
    }

    // ==========================================
    // 🌐 ম্যাজিক: ডেটাবেস (Global Settings) থেকে চেক করে পুরো সেকশন শো/হাইড করা
    // ==========================================
    let showBazarReport = true; // ডিফল্ট
    if (state.settings && state.settings.showBazarReport !== undefined) {
        showBazarReport = state.settings.showBazarReport;
    }
    
    const toggleBtn = document.getElementById('toggle-bazar-report');
    if (toggleBtn) toggleBtn.checked = showBazarReport;

    if (showBazarReport && (summaryCards || nonShopperCards)) {
        tbody.innerHTML += `
            <tr>
                <td colspan="4" class="bg-white border-0 pb-4 pt-2 px-0">
                    <div class="p-3 p-md-4 rounded-4 shadow-sm" style="background: linear-gradient(145deg, #fdfbfb 0%, #ebedee 100%); border: 1px solid #e2e8f0;">
                        <div class="text-secondary fw-bold mb-3 d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2" style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">
                            <div><i class="bi bi-award-fill text-warning fs-5 me-2"></i> Monthly Shopper Report</div>
                        </div>
                        <div class="d-flex flex-wrap">${summaryCards}</div>
                        ${nonShopperCards}
                    </div>
                </td>
            </tr>
        `;
    }


    const sortedDates = Object.keys(groupedBazar).sort((a, b) => new Date(b) - new Date(a));
    const datesToShow = sortedDates.slice(0, visibleBazarLimit);

    datesToShow.forEach(date => {
        const items = groupedBazar[date];
        const dateObj = new Date(date);
        const niceDate = dateObj.toLocaleDateString('en-GB');
        const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'short' });
        const dailyTotal = items.reduce((sum, current) => sum + current.amount, 0);

        let shopperName = '';
        let shopperRoom = '';
        let shopperId = '';

        // ==========================================
        // --- ম্যাজিক ২: হেডারের জন্য ডেটা বের করা ---
        // ==========================================
        const newShopperItem = items.find(i => i.shopper && typeof i.shopper === 'object' && i.shopper.name);
        if (newShopperItem) {
            shopperId = newShopperItem.shopper._id || '';
            shopperName = newShopperItem.shopper.name;
            shopperRoom = newShopperItem.shopper.room;
        }
        else {
            const oldShopperItem = items.find(i => i.note && i.note.includes('বাজারকারী'));
            if (oldShopperItem) {
                shopperName = oldShopperItem.note.replace(/বাজারকারী\s*:?/g, '').split(',')[0].trim();
                const mObj = state.members.find(m => m.name === shopperName);
                if (mObj) {
                    shopperRoom = mObj.room;
                    shopperId = mObj._id;
                }
            }
        }

        const shopperHTML = shopperName ?
            `<span onclick="editShopperForDate('${date}', '${shopperId}')" class="badge bg-white border border-primary border-opacity-25 text-primary rounded-pill px-2 py-1 shadow-sm" style="cursor: pointer; transition: 0.2s;" title="Edit Shopper Name" onmouseover="this.classList.add('bg-light')" onmouseout="this.classList.remove('bg-light')">
                <i class="bi bi-pencil-square me-1"></i>${shopperName} <span class="text-muted fw-normal d-none d-sm-inline ms-1">(${shopperRoom})</span>
            </span>`
            :
            `<span onclick="editShopperForDate('${date}', '')" class="badge bg-light border border-secondary border-opacity-50 text-secondary rounded-pill px-2 py-1 shadow-sm" style="cursor: pointer; transition: 0.2s;" title="Add Shopper Name" onmouseover="this.classList.remove('bg-light', 'text-secondary'); this.classList.add('bg-secondary', 'text-white');" onmouseout="this.classList.remove('bg-secondary', 'text-white'); this.classList.add('bg-light', 'text-secondary');">
                <i class="bi bi-person-plus-fill me-1"></i>Add Shopper
            </span>`;

        tbody.innerHTML += `
            <tr class="table-light border-bottom border-primary border-opacity-25">
                <td colspan="4" class="p-2 p-md-3">
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 gap-md-3">
                        <div class="d-flex flex-wrap align-items-center gap-2 w-100 w-md-auto">
                            <span class="fw-bold text-primary" style="font-size: 0.95rem;"><i class="bi bi-calendar-event me-1"></i>${niceDate} <span class="text-secondary small">(${dayName})</span></span>
                            ${shopperHTML}
                        </div>
                        <div class="d-flex justify-content-between align-items-center w-100 w-md-auto bg-white px-3 py-1 rounded-pill border border-primary border-opacity-25 shadow-sm mt-1 mt-md-0">
                            <span class="fw-bold text-dark me-3" style="font-size: 0.85rem;">Total: <span class="text-danger fs-6 ms-1">৳${dailyTotal}</span></span>
                            <button onclick="deleteFullDayBazar('${date}')" class="btn btn-sm btn-outline-danger p-1 rounded-circle d-flex justify-content-center align-items-center" style="width: 26px; height: 26px;" title="Delete Entire Day">
                                <i class="bi bi-trash-fill" style="font-size: 0.8rem;"></i>
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;

        items.forEach(entry => {
            const rawDate = new Date(entry.date).toISOString().split('T')[0];
            const safeItem = entry.item ? entry.item.replace(/'/g, "\\'") : '';

            // ==========================================
            // --- ম্যাজিক ৩: Note এর অস্তিত্ব চিরতরে শেষ ---
            // ==========================================
            tbody.innerHTML += `
                <tr>
                    <td class="text-center text-muted small align-middle border-0 border-bottom border-light" style="width: 30px;">↳</td>
                    
                    <td class="text-start fw-bold align-middle border-0 border-bottom border-light text-dark text-wrap w-100">
                        ${entry.item}
                    </td>
                    
                    <td class="text-end fw-bold text-danger align-middle border-0 border-bottom border-light text-nowrap" style="width: 1%; padding-right: 15px; font-size: 1rem;">৳${entry.amount}</td>
                    
                    <td class="text-end align-middle border-0 border-bottom border-light text-nowrap" style="width: 1%;">
                        <button onclick="openEditBazarModal(this, '${entry._id}', '${rawDate}', '${safeItem}', ${entry.amount}, '')" class="btn btn-sm btn-light text-primary border shadow-sm p-1 me-1" title="Edit">
                            <i class="bi bi-pencil" style="font-size: 0.8rem;"></i>
                        </button>
                        <button onclick="deleteBazar('${entry._id}')" class="btn btn-sm btn-light text-danger border shadow-sm p-1" title="Delete">
                            <i class="bi bi-trash" style="font-size: 0.8rem;"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    });

    if (sortedDates.length > visibleBazarLimit) {
        tbody.innerHTML += `
            <tr>
                <td colspan="4" class="text-center py-4 border-0 bg-white">
                    <button onclick="loadMoreBazar()" class="btn btn-outline-primary rounded-pill px-4 py-2 shadow-sm fw-bold">
                        <i class="bi bi-arrow-down-circle me-1"></i> Load More Bazars
                    </button>
                </td>
            </tr>
        `;
    }
}

// নতুন renderManagerSelection ফাংশন:
function renderManagerSelection() {
    const select = document.getElementById('select-manager');
    if (!select) return;

    select.innerHTML = '<option value="">Choose Member...</option>';
    state.members.filter(m => m.isActive).forEach(m => {
        // যদি এই মাসের রিপোর্টে অলরেডি ম্যানেজার থাকে, তাহলে তাকে সিলেক্টেড দেখাবে
        const isSelected = state.report.managerId === m._id ? 'selected' : '';
        select.innerHTML += `<option value="${m._id}" ${isSelected}>${m.name} (${m.room})</option>`;
    });

    const managerNameEl = document.getElementById('current-manager-name');
    if (state.report.managerId) {
        const managerObj = state.members.find(m => m._id === state.report.managerId);
        // "is getting free meals." লেখাটি এখান থেকে মুছে দেওয়া হয়েছে
        managerNameEl.innerHTML = `Currently: <strong class="text-success">${managerObj ? managerObj.name : 'Unknown'}</strong>`;
    } else {
        managerNameEl.innerHTML = "No manager assigned. Everyone is paying.";
    }
}

function renderDepositSelect() {
    const selectElement = document.getElementById('deposit-member'); // আপনার HTML এর ID যদি ভিন্ন হয়, তবে এখানে বসাবেন
    if (!selectElement) return;

    // শুরুতে একটি ডিফল্ট অপশন বসানো
    selectElement.innerHTML = '<option value="" disabled selected>Choose Member...</option>';

    // ১. শুধু অ্যাক্টিভ মেম্বারদের ফিল্টার করা
    // ২. তাদের রুম নাম্বার অনুযায়ী ছোট থেকে বড় সিরিয়ালে সাজানো (Sort)
    const sortedMembers = state.members
        .filter(m => m.isActive)
        .sort((a, b) => String(a.room).localeCompare(String(b.room), undefined, { numeric: true }));

    // ৩. সাজানো লিস্টটি ড্রপডাউনে যুক্ত করা
    sortedMembers.forEach(m => {
        selectElement.innerHTML += `<option value="${m._id}">${m.name} (Room: ${m.room})</option>`;
    });
}

// আপডেটেড saveManager ফাংশন (With SweetAlert2 and Loading Animation)
async function saveManager() {
    try {
        const memberId = document.getElementById('select-manager').value;
        if (!memberId) {
            Swal.fire('Oops!', 'ম্যানেজার সেট করার জন্য অন্তত একজনকে সিলেক্ট করুন।', 'warning');
            return;
        }

        // ব্যবহারকারীকে বোঝানোর জন্য বাটনে Loading স্পিনার দেখানো
        const btn = document.querySelector('button[onclick="saveManager()"]');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Saving...';
        btn.disabled = true;

        const res = await fetch(`${API_BASE_URL}/manager`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member: memberId, year: currentYear, month: currentMonth })
        });

        const json = await res.json();

        // কাজ শেষ হলে বাটনের অবস্থা আগের মতো করা
        btn.innerHTML = originalHTML;
        btn.disabled = false;

        if (res.ok && json.success) {
            await loadAllData();
            // বিরক্তিকর অ্যালার্ট সরিয়ে স্ক্রিনের কোণায় সুন্দর টোস্ট (Toast) যুক্ত করা হলো
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Manager Updated!' });
        } else {
            Swal.fire('Error!', 'ম্যানেজার সেট করতে সমস্যা হয়েছে: ' + (json.message || 'API Error!'), 'error');
            console.error("Manager API Error Response:", json);
        }
    } catch (error) {
        console.error("Manager Setup Error:", error);
        Swal.fire('Error!', 'সার্ভার বা ইন্টারনেট কানেকশনে সমস্যা হয়েছে!', 'error');

        const btn = document.querySelector('button[onclick="saveManager()"]');
        if (btn) {
            btn.innerHTML = 'Save Manager';
            btn.disabled = false;
        }
    }
}

// Report টেবিল আপডেট করা (প্রফেশনাল লুক)
function renderReportTable() {
    document.getElementById('report-expense').innerText = state.report.totalExpense;
    document.getElementById('report-meals').innerText = state.report.totalMeals;

    if (state.report.calcMode === 'fixed') {
        document.getElementById('report-rate').innerHTML = '<span class="fs-6">Fixed System</span>';
    } else {
        document.getElementById('report-rate').innerText = state.report.mealRate.toFixed(2);
    }

    const tbody = document.getElementById('table-report');
    tbody.innerHTML = '';

    const activeReportMembers = state.report.members.filter(member => member.totalMeals > 0);

    if (activeReportMembers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-5">কোনো মিল ডেটা পাওয়া যায়নি।</td></tr>`;
        return;
    }

    activeReportMembers.forEach(member => {
        // ম্যাজিক: ব্যালেন্স মাইনাস হলে হালকা লাল ব্যাকগ্রাউন্ড, প্লাস হলে হালকা সবুজ
        const isDue = member.balance < 0;
        const balanceColorClass = isDue ? 'text-danger fw-bold bg-danger bg-opacity-10' : 'text-success fw-bold bg-success bg-opacity-10';
        const balanceText = isDue ? `Due: ৳${Math.abs(member.balance).toFixed(2)}` : `Adv: ৳${member.balance.toFixed(2)}`;

        const managerBadge = member.isManager ? '<span class="badge bg-warning text-dark ms-2 border" style="font-size: 0.65rem;">Manager</span>' : '';
        const payableText = member.isManager ? '<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">Free (Manager)</span>' : `৳${member.payableAmount.toFixed(2)}`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-3 align-middle">
                <div class="fw-bold text-dark fs-6">${member.name} ${managerBadge}</div>
                <small class="text-muted">Room: ${member.room}</small>
            </td>
            <td class="text-center align-middle">
                <span class="badge bg-secondary rounded-pill px-3">${member.totalMeals}</span>
            </td>
            <td class="text-end align-middle text-muted">${payableText}</td>
            <td class="text-end align-middle fw-bold text-primary">৳${member.depositedAmount.toFixed(2)}</td>
            <td class="text-end align-middle px-3 ${balanceColorClass}" style="font-size: 1.05rem;">
                ${balanceText}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- BALANCE TABLE LOGIC ---
function renderBalanceTable() {
    const tbody = document.getElementById('table-balance');
    const dueEl = document.getElementById('total-due-amount');
    const advEl = document.getElementById('total-adv-amount');

    if (!tbody) return;
    tbody.innerHTML = '';

    let totalDue = 0;
    let totalAdv = 0;

    if (!state.report || !state.report.members || state.report.members.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="text-center text-muted py-4">No balance data available. Select a date range from the Dashboard first.</td></tr>`;
        if (dueEl) dueEl.innerText = "0.00";
        if (advEl) advEl.innerText = "0.00";
        return;
    }

    state.report.members.forEach(member => {
        if (member.balance < 0) {
            totalDue += Math.abs(member.balance); 
        } else if (member.balance > 0) {
            totalAdv += member.balance; 
        }

        const balanceColor = member.balance < 0 ? 'text-danger' : 'text-success';
        const balanceText = member.balance < 0 ? `Due: ৳${Math.abs(member.balance).toFixed(2)}` : `Adv: ৳${member.balance.toFixed(2)}`;
        const managerBadge = member.isManager ? '<span class="badge bg-warning text-dark ms-1" style="font-size: 0.65rem;">Manager</span>' : '';

        // ম্যাজিক: পুরো Row (tr) টাকে ক্লিকেবল করা হলো এবং hover ইফেক্ট দেওয়া হলো
        tbody.innerHTML += `
            <tr onclick="showMemberHistory('${member.memberId || member._id}')" class="align-middle" style="cursor: pointer; transition: background 0.2s;" onmouseover="this.style.backgroundColor='#f8f9fa'" onmouseout="this.style.backgroundColor='transparent'" title="${member.name} এর হিস্ট্রি দেখতে ক্লিক করুন">
                <td class="ps-2 ps-md-4 w-100 py-3 border-bottom">
                    <div class="fw-bold text-dark fs-6">${member.name} ${managerBadge}</div>
                    <small class="text-muted"><i class="bi bi-door-closed"></i> Room: ${member.room}</small>
                </td>
                <td class="text-end pe-2 pe-md-4 fw-bold ${balanceColor} border-bottom" style="font-size: 1.1rem; width: 1%; white-space: nowrap;">
                    ${balanceText}
                    <i class="bi bi-chevron-right ms-2 text-secondary opacity-50" style="font-size: 0.9rem;"></i>
                </td>
            </tr>
        `;
    });

    // ২. হিসাব করা ব্যালেন্সগুলো হেডারের বক্সে বসিয়ে দেওয়া
    if (dueEl) dueEl.innerText = totalDue.toFixed(2);
    if (advEl) advEl.innerText = totalAdv.toFixed(2);
}

// --- LOW BALANCE ALERT LOGIC ---
function renderLowBalanceAlert() {
    const tbody = document.getElementById('table-low-balance');
    const thresholdInput = document.getElementById('low-balance-threshold');

    if (!tbody || !thresholdInput) return;

    if (!thresholdInput.hasAttribute('data-loaded')) {
        const savedThreshold = localStorage.getItem('savedLowBalanceLimit');
        if (savedThreshold !== null) {
            thresholdInput.value = savedThreshold;
        }
        thresholdInput.setAttribute('data-loaded', 'true');
    }

    const threshold = Number(thresholdInput.value) || 0;
    localStorage.setItem('savedLowBalanceLimit', threshold);

    tbody.innerHTML = '';

    if (!state.report || !state.report.members || state.report.members.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3">No data available.</td></tr>`;
        return;
    }

    // লজিক আপডেট: ব্যালেন্স লিমিটের নিচে হবে, কিন্তু একদম '০' (0) হওয়া যাবে না!
    const lowBalanceMembers = state.report.members.filter(m =>
        m.balance <= threshold && m.balance !== 0 && !m.isManager
    );

    if (lowBalanceMembers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-success py-4">
                    <i class="bi bi-check-circle-fill fs-4 d-block mb-1"></i> 
                    <span class="fw-bold">All good!</span> No member has a balance below ৳${threshold}.
                </td>
            </tr>`;
        return;
    }

    lowBalanceMembers.sort((a, b) => a.balance - b.balance);

    lowBalanceMembers.forEach(member => {
        const balanceColor = member.balance < 0 ? 'text-danger' : 'text-warning text-dark';
        const displayBalance = Math.abs(member.balance).toFixed(2);

        // ম্যাজিক: member.balance সরাসরি পাঠানো হচ্ছে (মাইনাস সহ), যাতে মেসেজ আলাদা করা যায়!
        const phoneStr = member.phone || '';
        const waBtn = phoneStr ?
            `<button onclick="sendWhatsAppMsg('${phoneStr}', '${member.name}', ${member.balance})" class="btn btn-sm btn-success rounded-circle shadow-sm ms-2" style="width: 28px; height: 28px; padding: 0; line-height: 1;" title="Send WhatsApp Message"><i class="bi bi-whatsapp" style="font-size: 0.85rem;"></i></button>` :
            `<button class="btn btn-sm btn-light text-muted border rounded-circle shadow-sm ms-2" title="No Phone Number Added" style="width: 28px; height: 28px; padding: 0; line-height: 1;" disabled><i class="bi bi-whatsapp" style="font-size: 0.85rem;"></i></button>`;

        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-dark align-middle">${member.name}</td>
                <td class="text-muted align-middle"><small>${member.room}</small></td>
                <td class="text-end fw-bold pe-3 align-middle ${balanceColor}">
                    ${member.balance < 0 ? '৳-' : '৳'}${displayBalance}
                    ${waBtn}
                </td>
            </tr>
        `;
    });
}

// ==========================================
// --- LOAD MORE PAGINATION FUNCTIONS ---
// ==========================================
function loadMoreMeals() {
    visibleMealLimit += 5; // প্রতি ক্লিকে আরও ৫ দিনের ডেটা বাড়বে
    renderMealTables();
}

function loadMoreBazar() {
    visibleBazarLimit += 5; // প্রতি ক্লিকে আরও ৫ দিনের ডেটা বাড়বে
    renderBazarTable();
}


// Add Bazar এর লিস্টে মেম্বারদের নাম আনা
function populateBazarShopper() {
    const select = document.getElementById('bazar-bulk-member');
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>-- মেম্বার সিলেক্ট করুন --</option>';

    // শুধু অ্যাক্টিভ মেম্বারদের রুম নাম্বার অনুযায়ী সাজিয়ে দেখানো
    const activeMembers = state.members
        .filter(m => m.isActive)
        .sort((a, b) => String(a.room).localeCompare(String(b.room), undefined, { numeric: true }));

    activeMembers.forEach(m => {
        select.innerHTML += `<option value="${m._id}">${m.name} (${m.room})</option>`;
    });

    // ডিফল্টভাবে আজকের ডেট বসানো
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(today.getTime() - offset)).toISOString().split('T')[0];
    const dateInput = document.getElementById('bazar-bulk-date');
    if (dateInput) dateInput.value = localISOTime;
}

function populateSettingsForm() {
    const s = state.settings;
    if (!s) return;

    const modeSelect = document.getElementById('setting-calc-mode');
    if (modeSelect) {
        modeSelect.value = s.calcMode || 'average';
        if (typeof toggleFixedRates === 'function') toggleFixedRates();
    }

    const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
    setVal('rate-breakfast', s.rateBreakfast);
    setVal('rate-lunch', s.rateLunch);
    setVal('rate-dinner', s.rateDinner);
    setVal('rate-sehri', s.rateSehri);
    setVal('rate-iftar', s.rateIftar);

    // ড্যাশবোর্ডের ব্যাজে নাম আপডেট করা
    const modeTextEl = document.getElementById('calc-mode-text');
    const calcModeBadge = document.getElementById('display-calc-mode');
    if (modeTextEl && calcModeBadge) {
        if (s.calcMode === 'fixed') {
            modeTextEl.innerText = 'Fixed Rate';
            calcModeBadge.className = 'badge bg-warning bg-opacity-10 text-dark border border-warning border-opacity-50';
        } else {
            modeTextEl.innerText = 'Average';
            calcModeBadge.className = 'badge bg-success bg-opacity-10 text-success border border-success border-opacity-25';
        }
    }
}