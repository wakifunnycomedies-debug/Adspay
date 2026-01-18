// Ensure this runs only after the page loads
async function initLeaderboard() {
    const list = document.getElementById('leader-list');
    const podium = document.getElementById('podium');
    
    // Check if we are on the right page
    if (!list || !podium) return;

    // Fetch top 10 profiles from Supabase
    const { data: topUsers, error } = await supabaseClient
        .from('profiles')
        .select('username, balance_points')
        .order('balance_points', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error fetching leaderboard:", error);
        return;
    }

    // 1. Build Podium (Top 3)
    // We re-order them so 'Second' is on left, 'First' in middle, 'Third' on right
    if (topUsers.length >= 1) {
        const p1 = topUsers[0];
        const p2 = topUsers[1] || { username: 'None', balance_points: 0 };
        const p3 = topUsers[2] || { username: 'None', balance_points: 0 };

        podium.innerHTML = `
            <div class="podium-item second animate__animated animate__fadeInUp">
                <i class="fas fa-medal" style="color: #C0C0C0;"></i>
                <p>${p2.username.split('@')[0]}</p>
                <strong>${p2.balance_points.toLocaleString()}</strong>
            </div>
            <div class="podium-item first animate__animated animate__fadeInUp">
                <i class="fas fa-crown" style="color: #FFD700;"></i>
                <p>${p1.username.split('@')[0]}</p>
                <strong>${p1.balance_points.toLocaleString()}</strong>
            </div>
            <div class="podium-item third animate__animated animate__fadeInUp">
                <i class="fas fa-medal" style="color: #CD7F32;"></i>
                <p>${p3.username.split('@')[0]}</p>
                <strong>${p3.balance_points.toLocaleString()}</strong>
            </div>
        `;
    }

    // 2. Build Table (All 10)
    list.innerHTML = topUsers.map((user, index) => `
        <tr class="animate__animated animate__fadeIn">
            <td>#${index + 1}</td>
            <td>${user.username.split('@')[0]}</td>
            <td><strong>${user.balance_points.toLocaleString()} pts</strong></td>
        </tr>
    `).join('');
}

// Start the script
document.addEventListener('DOMContentLoaded', initLeaderboard);