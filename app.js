// 1. INITIALIZE SUPABASE
const SUPABASE_URL = "https://bilneshaufwdqfyfspiq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbG5lc2hhdWZ3ZHFmeWZzcGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3ODU0MzAsImV4cCI6MjA4MTM2MTQzMH0.39a8g6DOpgUAHsCBqHDAR64Uo-u74THLEf-Wje6wAuI";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// --- DECLARE ALL UI ELEMENTS AT THE TOP TO PREVENT INITIALIZATION ERRORS ---
const signupForm = document.querySelector('#signup-form');
const loginForm = document.querySelector('#login-form');
const togglePassword = document.querySelector('#togglePassword');
const passwordInput = document.querySelector('#password');
const eyeIcon = document.querySelector('#eyeIcon');
const logoutBtns = document.querySelectorAll('#logout-btn');
const startVideoBtn = document.getElementById('start-video-btn');
const adNotice = document.getElementById('ad-active-notice');
const videoContainer = document.getElementById('adsterra-video-container');
const claimDailyBtn = document.getElementById('claim-daily-btn');
const withdrawForm = document.getElementById('withdraw-form');

// 2. REFERRAL URL TRACKING
const urlParams = new URLSearchParams(window.location.search);
const referralFromUrl = urlParams.get('ref');
if (referralFromUrl) {
    localStorage.setItem('pending_referral', referralFromUrl);
}

// 3. TOAST NOTIFICATION ENGINE
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if(!container) return; 
    const toast = document.createElement('div');
    toast.className = `toast ${type} animate__animated animate__fadeInRight`;
    const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle');
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.replace('animate__fadeInRight', 'animate__fadeOutRight');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// 4. SIGNUP LOGIC (With Referral Reward)
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.querySelector('#email').value;
        const password = document.querySelector('#password').value;
        const btn = signupForm.querySelector('button');
        const referredByCode = localStorage.getItem('pending_referral');

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Securing...';
        btn.disabled = true;

        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    ref_by: referredByCode,
                    my_ref_code: Math.random().toString(36).substring(2, 8).toUpperCase()
                }
            }
        });

        if (error) {
            showToast(error.message, 'error');
            btn.innerHTML = 'Secure Sign Up';
            btn.disabled = false;
        } else {
            if (referredByCode) await rewardReferrer(referredByCode);
            showToast('Account created! Please login.', 'success');
            localStorage.removeItem('pending_referral');
            setTimeout(() => window.location.href = 'dashboard.html', 3000);
        }
    });
}

// 5. REFERRAL REWARD FUNCTION
async function rewardReferrer(code) {
    const { data: referrer } = await supabaseClient
        .from('profiles')
        .select('id, balance_points')
        .eq('referral_code', code)
        .single();

    if (referrer) {
        const bonus = 500; 
        const newBalance = (referrer.balance_points || 0) + bonus;
        await supabaseClient.from('profiles').update({ balance_points: newBalance }).eq('id', referrer.id);
    }
}

// 6. LOGIN LOGIC
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.querySelector('#email').value;
        const password = document.querySelector('#password').value;
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) { showToast(error.message, 'error'); }
        else { showToast('Welcome back!', 'success'); setTimeout(() => window.location.href = 'dashboard.html', 1500); }
    });
}

// 7. PASSWORD TOGGLE
if (togglePassword) {
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        eyeIcon.classList.toggle('fa-eye');
        eyeIcon.classList.toggle('fa-eye-slash');
    });
}

// 8. SESSION PROTECTION & DATA LOADING
async function protectSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const isAuthPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html');
    
    if (!session && !isAuthPage) {
        window.location.href = 'login.html';
        return;
    }
    if (session) loadDashboardData(session.user);
}

async function loadDashboardData(user) {
    const nameElement = document.getElementById('display-name');
    if (nameElement) nameElement.innerText = user.email.split('@')[0];

    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();

    if (profile) {
        const points = profile.balance_points || 0;
        const pointsDisplay = document.getElementById('balance-points') || document.getElementById('current-points');
        if (pointsDisplay) pointsDisplay.innerText = points;
        if (typeof updateNairaConversion === "function") updateNairaConversion(points);

        // Referral Link Logic
        const refInput = document.getElementById('referral-link');
        if (refInput && profile.referral_code) {
            refInput.value = `${window.location.origin}/signup.html?ref=${profile.referral_code}`;
        }
    }
}

// 9. COPY REFERRAL LINK
function copyReferral() {
    const copyText = document.getElementById("referral-link");
    if(copyText) {
        copyText.select();
        navigator.clipboard.writeText(copyText.value);
        showToast("Link copied! Share it now.", "success");
    }
}

// 10. SECURE REWARD (FOR ADS & DAILY)
async function secureReward(pts) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabaseClient.from('profiles').select('balance_points').eq('id', user.id).single();
    const newBalance = (profile?.balance_points || 0) + pts;

    const { error } = await supabaseClient.from('profiles').update({ balance_points: newBalance }).eq('id', user.id);
    if (!error) {
        const pointsDisplay = document.getElementById('balance-points') || document.getElementById('current-points');
        if(pointsDisplay) pointsDisplay.innerText = newBalance;
        showToast(`+${pts} Points Added!`, 'success');
        if (typeof updateNairaConversion === "function") updateNairaConversion(newBalance);
    }
}

// 11. AD LOGIC
const ADSTERRA_URL = "https://latherprofanecognizance.com/h2b6301yd?key=6a2af8d385138fe38dbda2153d09543d";
if(startVideoBtn) {
    let timeLeft = 30;
    startVideoBtn.addEventListener('click', () => {
        startVideoBtn.style.display = 'none';
        adNotice.style.display = 'block';
        videoContainer.innerHTML = `<iframe src="${ADSTERRA_URL}" style="width:100%; height:300px; border:none; border-radius:15px;"></iframe>`;

        let adInterval = setInterval(async () => {
            if (document.visibilityState === 'visible') {
                timeLeft--;
                document.getElementById('timer-sec').innerText = timeLeft;
            }
            if (timeLeft <= 0) {
                clearInterval(adInterval);
                await secureReward(50);
                videoContainer.innerHTML = '<p>Ad Completed!</p>';
                adNotice.style.display = 'none';
                setTimeout(() => { startVideoBtn.style.display = 'inline-block'; timeLeft = 30; }, 5000); 
            }
        }, 1000);
    });
}

// 12. DAILY BONUS
if (claimDailyBtn) {
    claimDailyBtn.addEventListener('click', async () => {
        claimDailyBtn.disabled = true;
        claimDailyBtn.innerText = "Processing...";
        await secureReward(20);
        claimDailyBtn.innerText = "Claimed!";
    });
}

// 13. WITHDRAWAL LOGIC
const CONVERSION_RATE = 0.1;
const MIN_WITHDRAWAL_POINTS = 5000;

function updateNairaConversion(points) {
    const nairaElement = document.getElementById('naira-value');
    if (nairaElement) {
        nairaElement.innerText = `₦${(points * CONVERSION_RATE).toLocaleString()}`;
    }
}

if (withdrawForm) {
    withdrawForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseInt(document.getElementById('withdraw-amount').value);
        const method = document.getElementById('payment-method').value;
        const account = document.getElementById('account-number').value;
        const btn = document.getElementById('withdraw-btn');

        if (amount < MIN_WITHDRAWAL_POINTS) {
            showToast(`Minimum is ${MIN_WITHDRAWAL_POINTS} points`, "error");
            return;
        }

        btn.disabled = true;
        const { data: { user } } = await supabaseClient.auth.getUser();
        const { data: profile } = await supabaseClient.from('profiles').select('balance_points').eq('id', user.id).single();

        if (profile.balance_points < amount) {
            showToast("Insufficient Balance!", "error");
            btn.disabled = false;
            return;
        }

        const { error } = await supabaseClient.from('withdrawals').insert([{
            user_id: user.id, amount_points: amount, payment_method: method, account_details: account, status: 'pending'
        }]);

        if (!error) {
            const newBal = profile.balance_points - amount;
            await supabaseClient.from('profiles').update({ balance_points: newBal }).eq('id', user.id);
            showToast("Withdrawal Requested!", "success");
            location.reload();
        }
    });
}

// 14. GLOBAL INIT
document.addEventListener('DOMContentLoaded', () => {
    protectSession();

    // Add this to your Global Init in app.js
const currentPath = window.location.pathname;
document.querySelectorAll('.nav-item').forEach(link => {
    if (link.getAttribute('href') === currentPath.split('/').pop()) {
        link.classList.add('active');
    }
});
});

logoutBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    });
});