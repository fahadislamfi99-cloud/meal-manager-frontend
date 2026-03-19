// --- LIVE API CONFIGURATION ---
const API_BASE_URL = 'https://meal-manager-backend-kp8y.onrender.com/api';

const state = {
    members: [],
    bazar: [],
    meals: [],
    deposits: [], // এই লাইনটি মিসিং ছিল
    report: { totalExpense: 0, totalMeals: 0, mealRate: 0, members: [] },
    settings: { calcMode: 'average' }
};

let activeEditBtn = null; // কোন পেন আইকনে ক্লিক হয়েছে তা মনে রাখার জন্য

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth() + 1;
const todayString = today.toISOString().split('T')[0];

// --- গ্লোবাল ডেট রেঞ্জ ভ্যারিয়েবল (নতুন) ---
let globalStartDate = '';
let globalEndDate = '';

// --- Pagination Limits ---
let visibleMealLimit = 5; // শুরুতে ৫ দিনের ডেটা দেখাবে
let visibleBazarLimit = 5;