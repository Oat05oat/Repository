const GAS_URL = "https://script.google.com/macros/s/AKfycbwz_WIhmE84bYpcTkMrE6tK5J3SQDlxDH3W5Dv3Pq3P7kWxVxegU5RNp0x-QmSCcsHspw/exec";

async function apiCall(action, payload) {
    try {
        const response = await fetch(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action, payload })
        });
        const res = await response.json();
        if (res.status === "error") throw new Error(res.message);
        return res.data;
    } catch (err) {
        Swal.fire({ icon: "error", title: "ผิดพลาด", text: err.message });
        throw err;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("admin")) handleAdminPage();
    else if (path.includes("dashboard")) handleDashboardPage();
    else handleLoginPage();
});

// === ระบบลูกค้า ===
async function handleDashboardPage() {
    const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    if (!userStr) { window.location.href = "index.html"; return; }
    const loggedInUser = JSON.parse(userStr);
    const data = await apiCall("getFullDashboardData", { phone: loggedInUser.phone });
    renderDashboard(data);
}

function renderDashboard(data) {
    const { user, rewards, notifications } = data;
    const app = document.getElementById("app");
    const cleanPhone = user.phone.replace(/'/g, '');

    app.innerHTML = `
    <style>
        .noti-btn { position: absolute; top: 15px; right: 15px; background: #fff; padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; cursor:pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.1); z-index:100; }
        .avatar { width: 85px; height: 85px; background: #fff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 2rem; box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin-top: 40px; }
        .clean-card { background: #fff; border-radius: 20px; padding: 20px; margin-bottom: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); border:none; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; background: #fff; display: flex; border-top: 1px solid #eee; z-index: 1000; }
        .nav-item { flex: 1; text-align: center; padding: 12px; color: #aaa; cursor: pointer; }
        .nav-item.active { color: #3b4b5b; font-weight: bold; }
        .section { display: none; padding: 20px; padding-bottom: 100px; max-width: 500px; margin: 0 auto; }
        .section.active { display: block; }
    </style>

    <div class="noti-btn" onclick="showNotis()"><i class="bi bi-bell-fill text-warning"></i> ${notifications.length}</div>
    <div class="text-center"><div class="avatar">${user.firstName[0].toUpperCase()}</div><h5 class="mt-2 fw-bold text-dark">${user.firstName} ${user.lastName}</h5></div>

    <section id="tab-home" class="section active">
        <div class="clean-card text-center py-4"><h1>${user.totalPoints}</h1><p class="text-muted">พอยท์สะสม</p></div>
        <div class="clean-card text-center"><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cleanPhone}" style="width:130px;"><p class="mt-3 fw-bold">${cleanPhone}</p></div>
    </section>

    <section id="tab-rewards" class="section">
        <h6 class="fw-bold mb-3 text-white">แลกรางวัล</h6>
        <div class="row g-2">${rewards.map(r => `
            <div class="col-6 mb-2"><div class="clean-card p-3 h-100 text-center"><div class="fw-bold small">${r.name}</div>
            <button class="btn btn-sm btn-dark w-100 rounded-pill mt-2" onclick="redeemGift('${r.rewardId}','${r.name}')">${r.pointsRequired} P</button></div></div>
        `).join("")}</div>
    </section>

    <section id="tab-history" class="section">
        <h6 class="fw-bold mb-3 text-white">ประวัติ</h6>
        ${user.pointsHistory.map(h => `
            <div class="clean-card p-3 mb-2 d-flex justify-content-between align-items-center" onclick="${h.refCode ? `viewCoupon('${h.refCode}','${h.reason}','${h.status}')` : ''}">
                <div><b>${h.reason}</b><br><small>${new Date(h.timestamp).toLocaleDateString()}</small></div>
                <div class="text-end"><span class="${h.pointsChange > 0 ? 'text-success' : 'text-danger'}">${h.pointsChange}</span>${h.refCode ? '<br><small class="text-primary">ดู QR</small>' : ''}</div>
            </div>
        `).join("")}
    </section>

    <section id="tab-profile" class="section">
        <div class="clean-card p-0 overflow-hidden">
            <div class="p-3 border-bottom" onclick="editProfile()"><i class="bi bi-envelope"></i> แก้ไขอีเมล</div>
            <div class="p-3 text-danger" onclick="logout()"><i class="bi bi-box-arrow-right"></i> ออกจากระบบ</div>
        </div>
    </section>

    <nav class="bottom-nav">
        <div class="nav-item active" onclick="switchTab('tab-home', this)"><i class="bi bi-house-fill"></i></div>
        <div class="nav-item" onclick="switchTab('tab-rewards', this)"><i class="bi bi-gift-fill"></i></div>
        <div class="nav-item" onclick="switchTab('tab-history', this)"><i class="bi bi-clock-fill"></i></div>
        <div class="nav-item" onclick="switchTab('tab-profile', this)"><i class="bi bi-person-fill"></i></div>
    </nav>`;
}

// === ระบบ Admin ===
function handleAdminPage() {
    document.getElementById("app").innerHTML = `
    <style>body { background: #556677 !important; color: #fff; }</style>
    <div class="container py-4" style="max-width: 600px;">
        <div class="card p-4 shadow-lg border-0 mb-4 text-dark" style="border-radius:20px;">
            <h5 class="fw-bold mb-3">แอดมินสแกน / ค้นหา</h5>
            <div class="input-group mb-3">
                <button class="btn btn-primary" id="btnScan"><i class="bi bi-qr-code-scan"></i></button>
                <input type="text" id="adminInp" class="form-control" placeholder="เบอร์ หรือ รหัส RWD-...">
                <button class="btn btn-dark" id="btnSearch">ค้นหา</button>
            </div>
            <div id="adminRes" class="d-none p-3 bg-light rounded-3 border"></div>
        </div>
    </div>`;

    document.getElementById("btnScan").onclick = () => {
        Swal.fire({
            title: 'สแกนคูปอง',
            html: '<div id="qr-reader" style="width:100%; border-radius:10px; overflow:hidden;"></div><input type="file" id="file-qr" accept="image/*" class="form-control mt-3">',
            didOpen: () => {
                const scanner = new Html5Qrcode("qr-reader");
                const onOk = (t) => { scanner.stop(); document.getElementById("adminInp").value = t; Swal.close(); document.getElementById("btnSearch").click(); };
                scanner.start({ facingMode: "environment" }, { fps: 15, qrbox: 250 }, onOk);
                document.getElementById("file-qr").onchange = e => { if (e.target.files[0]) scanner.scanFile(e.target.files[0], true).then(onOk); };
            }
        });
    };

    document.getElementById("btnSearch").onclick = async () => {
        const val = document.getElementById("adminInp").value;
        if (val.startsWith("RWD-")) {
            const ok = await Swal.fire({ title: 'ยืนยันใช้คูปอง', text: val, showCancelButton: true });
            if (ok.isConfirmed) { await apiCall("useCoupon", { code: val }); Swal.fire("สำเร็จ", "คูปองใช้งานแล้ว", "success"); }
        } else {
            const user = await apiCall("searchUser", { phone: val });
            const res = document.getElementById("adminRes");
            res.classList.remove("d-none");
            res.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div><b>${user.firstName}</b><br><small>${user.phone}</small></div>
                    <div class="h4 text-primary">${user.totalPoints}</div>
                </div>
                <div class="mt-3">
                    <input type="number" id="amt" class="form-control mb-2" placeholder="แต้ม +/-">
                    <button class="btn btn-success w-100" id="savePt">บันทึกแต้ม</button>
                </div>`;
            document.getElementById("savePt").onclick = async () => {
                await apiCall("managePoints", { memberPhone: user.phone, pointsChange: document.getElementById("amt").value, reason: "Admin" });
                Swal.fire("สำเร็จ", "อัปเดตแต้มแล้ว", "success");
            };
        }
    };
}

// Global Functions
window.switchTab = (id, el) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    el.classList.add('active');
};
window.viewCoupon = (code, name, status) => {
    Swal.fire({
        title: 'คูปองของคุณ',
        html: `<b>${name}</b><br><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${code}" class="my-3"><br><div class="p-2 border border-dashed">${code}</div><p class="mt-2">${status==='used'?'ใช้แล้ว':'รอใช้งาน'}</p>`,
        showCloseButton: true
    });
};
window.redeemGift = async (id, name) => {
    const ok = await Swal.fire({ title: 'แลกของรางวัล?', text: name, showCancelButton: true });
    if (ok.isConfirmed) {
        const res = await apiCall("redeemReward", { memberPhone: JSON.parse(localStorage.getItem("loggedInUser")).phone, rewardId: id });
        window.viewCoupon(res.refCode, name, 'pending');
    }
};
