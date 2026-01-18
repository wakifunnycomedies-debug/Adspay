async function loadAdminData() {
    // 1. Initial Security Check
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (!profile || !profile.is_admin) {
        showToast("Access Denied: Admins Only", "error");
        setTimeout(() => window.location.href = 'dashboard.html', 2000);
        return;
    }

    // 2. Fetch Requests with Joined Profiles
    const { data: withdrawals, error } = await supabaseClient
        .from('withdrawals')
        .select(`
            id, 
            amount_points, 
            payment_method, 
            account_details, 
            status, 
            profiles (username)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        showToast("Error loading payouts", "error");
        return;
    }

    const list = document.getElementById('payout-list');
    list.innerHTML = '';

    withdrawals.forEach(req => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${req.profiles.username}</td>
            <td>${req.amount_points}</td>
            <td>${req.payment_method}</td>
            <td><code>${req.account_details}</code></td>
            <td><span class="badge ${req.status}">${req.status}</span></td>
            <td>
                ${req.status === 'pending' ? 
                `<button onclick="approvePayout('${req.id}')" class="btn-approve">Paid</button>` : 
                '<span>✅ Done</span>'}
            </td>
        `;
        list.appendChild(row);
    });
}

async function approvePayout(requestId) {
    const confirmPay = confirm("Are you sure you have sent the money via Opay/Palmpay?");
    if(!confirmPay) return;

    const { error } = await supabaseClient
        .from('withdrawals')
        .update({ status: 'completed' })
        .eq('id', requestId);

    if (!error) {
        showToast("Payout confirmed!", "success");
        loadAdminData();
    }
}

// Global init
loadAdminData();