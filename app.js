const GAS_URL = "https://script.google.com/macros/s/AKfycbwz_WIhmE84bYpcTkMrE6tK5J3SQDlxDH3W5Dv3Pq3P7kWxVxegU5RNp0x-QmSCcsHspw/exec";

// --- API Helper ---
async function apiCall(action, payload) {
    if (!Swal.isVisible()) showLoading();
    try {
        const response = await fetch(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action, payload })
        });
        const res = await response.json();
        Swal.close();
        if (res.status === "error") throw new Error(res.message);
        return res.data;
    } catch (err) {
        Swal.fire({ icon: "error", title: "ผิดพลาด", text: err.message });
        throw err;
    }
}

function showLoading() { Swal.fire({ title: 'กำลังโหลด...', allowOutsideClick: false, didOpen: () => Swal.showLoading() }); }
function hashPassword(password) { return CryptoJS.SHA256(password).toString(); }

// --- Router ---
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("admin")) handleAdminPage();
    else if (path.includes("dashboard")) handleDashboardPage();
    else if (path.includes("register")) handleRegisterPage();
    else handleLoginPage();
});

// ==========================================
// [1] LOGIN & REGISTER
// ==========================================
function handleLoginPage() {
    const form = document.getElementById("loginForm");
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const user = await apiCall("login", { 
                phone: document.getElementById("phone").value, 
                hashedPassword: hashPassword(document.getElementById("password").value) 
            });
            localStorage.setItem("loggedInUser", JSON.stringify(user.user));
            window.location.href = user.user.isAdmin ? "admin.html" : "dashboard.html";
        };
    }
}

function handleRegisterPage() {
    const regForm = document.getElementById("registerForm");
    const policyBtn = document.getElementById("viewPolicyLink");
    if(policyBtn) {
        policyBtn.onclick = (e) => {
            e.preventDefault();
            Swal.fire({ title: 'นโยบายความเป็นส่วนตัว', html: '<div class="text-start">1.เก็บข้อมูลพื้นฐาน<br>2.ใช้จัดการแต้ม<br>3.ไม่เปิดเผยข้อมูล</div>', showCloseButton: true });
        };
    }
}

// ==========================================
// [2] DASHBOARD (Navy & Silver)
// ==========================================
async function handleDashboardPage() {
    const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    if (!userStr) { window.location.href = "index.html"; return; }
    const loggedInUser = JSON.parse(userStr);
    const data = await apiCall("getFullDashboardData", { phone: loggedInUser.phone });
    
    const app = document.getElementById("app");
    const cleanPhone = data.user.phone.replace(/'/g, '');

    app.innerHTML = `
    <style>
        .navy-header { background: linear-gradient(180deg, #1e293b 0%, #334155 100%); height: 210px; border-radius: 0 0 45px 45px; position: relative; }
        .noti-icon { position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); color: white; border:none; padding: 10px 18px; border-radius: 18px; font-weight: bold; cursor:pointer; }
        .profile-float { margin-top: -55px; text-align: center; margin-bottom: 25px; }
        .avatar-box { width: 100px; height: 100px; background: white; border-radius: 35px; display: inline-flex; align-items: center; justify-content: center; font-size: 2.8rem; box-shadow: 0 12px 25px rgba(0,0,0,0.1); border: 4px solid #fff; }
        .card-white { background: white; border-radius: 28px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); margin-bottom: 20px; border: 1px solid #f1f5f9; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; background: white; display: flex; padding: 15px 0; border-radius: 30px 30px 0 0; box-shadow: 0 -10px 35px rgba(0,0,0,0.04); z-index: 1000; }
        .nav-item { flex: 1; text-align: center; color: #94a3b8; font-size: 0.8rem; cursor: pointer; }
        .nav-item.active { color: #4f46e5; font-weight: 800; transform: translateY(-5px); }
        .nav-item i { font-size: 1.6rem; display: block; }
        .section { display: none; padding: 20px; padding-bottom: 110px; max-width: 500px; margin: 0 auto; }
        .section.active { display: block; animation: slideUp 0.4s; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    </style>

    <div class="navy-header"><button class="noti-icon" id="btnShowNoti"><i class="bi bi-bell-fill"></i> ${data.notifications.length}</button></div>
    <div class="profile-float"><div class="avatar-box">${data.user.firstName[0]}</div><h4 class="mt-2 fw-bold text-dark">${data.user.firstName} ${data.user.lastName}</h4></div>

    <section id="tab-home" class="section active">
        <div class="card-white text-center">
            <p class="text-muted small fw-bold">คะแนนสะสมของคุณ</p>
            <h1 style="font-size: 4rem; font-weight: 900; color: #1e293b;">${data.user.totalPoints}</h1>
        </div>
        <div class="card-white text-center">
            <p class="fw-bold text-secondary mb-3">QR Code สะสมแต้ม</p>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cleanPhone}" class="border p-2 rounded-4" style="width:140px;">
            <h5 class="mt-3 fw-bold">${cleanPhone}</h5>
        </div>
    </section>

    <section id="tab-rewards" class="section">
        <h6 class="fw-bold mb-3 text-primary">รายการของรางวัล</h6>
        <div class="row g-2">
            ${data.rewards.map(r => `
                <div class="col-6 mb-2">
                    <div class="card-white p-3 h-100 text-center border-0 shadow-sm" style="border-radius:20px;">
                        <b class="d-block text-truncate small">${r.name}</b>
                        <button class="btn btn-sm btn-dark w-100 rounded-pill mt-3 fw-bold" onclick="redeemGift('${r.rewardId}','${r.name}')">แลก ${r.pointsRequired} P</button>
                    </div>
                </div>
            `).join("")}
        </div>
    </section>

    <section id="tab-history" class="section">
        <h6 class="fw-bold mb-3 text-dark">ประวัติการแลกรางวัล</h6>
        ${data.user.pointsHistory.map(h => `
            <div class="card-white p-3 d-flex justify-content-between align-items-center mb-2" 
                 onclick="${h.refCode ? `viewTicket('${h.refCode}','${h.reason}','${h.status}')` : ''}" 
                 style="cursor:${h.refCode ? 'pointer':'default'}">
                <div><b>${h.reason}</b><br><small class="text-muted">${new Date(h.timestamp).toLocaleDateString()}</small></div>
                <div class="text-end">
                    <span class="fw-bold ${h.pointsChange > 0 ? 'text-success':'text-danger'}">${h.pointsChange}</span>
                    ${h.refCode ? '<br><small class="text-primary fw-bold">คลิกดู QR</small>' : ''}
                </div>
            </div>
        `).join("")}
    </section>

    <section id="tab-profile" class="section">
        <div class="card-white p-0 overflow-hidden shadow-sm">
            <div class="p-3 border-bottom d-flex align-items-center" onclick="editEmail()"><i class="bi bi-envelope-at me-3"></i> แก้ไขอีเมลติดต่อ</div>
            <div class="p-3 text-danger fw-bold" onclick="logout()"><i class="bi bi-box-arrow-right me-3"></i> ออกจากระบบ</div>
        </div>
    </section>

    <nav class="bottom-nav">
        <div class="nav-item active" onclick="switchTab('tab-home', this)"><i class="bi bi-house-door-fill"></i>หน้าแรก</div>
        <div class="nav-item" onclick="switchTab('tab-rewards', this)"><i class="bi bi-gift-fill"></i>รางวัล</div>
        <div class="nav-item" onclick="switchTab('tab-history', this)"><i class="bi bi-clock-history"></i>ประวัติ</div>
        <div class="nav-item" onclick="switchTab('tab-profile', this)"><i class="bi bi-person-fill"></i>บัญชี</div>
    </nav>`;

    document.getElementById("btnShowNoti").onclick = () => {
        let content = data.notifications.map(n => `<div class="p-2 border-bottom text-start small">${n.message}</div>`).join("");
        Swal.fire({ title: 'การแจ้งเตือน', html: content || 'ไม่มีแจ้งเตือนใหม่', showCloseButton: true, showConfirmButton: false });
    };
}

// --- Global Actions ---
window.switchTab = (id, el) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    el.classList.add('active');
};

window.viewTicket = (code, name, status) => {
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(code)}`;
    Swal.fire({
        title: 'รหัสคูปองของคุณ',
        html: `<div class="p-3 bg-light rounded-4 border text-center">
                <p><b>${name}</b></p>
                <img src="${qr}" class="my-3 p-2 bg-white border" style="width:180px;">
                <div class="p-3 border border-dashed rounded-4 fw-bold fs-3 bg-white">${code}</div>
                <p class="mt-3 fw-bold ${status==='used'?'text-success':'text-warning'}">${status==='used'?'ใช้งานแล้ว':'รอใช้สิทธิ์'}</p>
            </div>`,
        showCloseButton: true, confirmButtonText: 'ปิดหน้าต่าง', confirmButtonColor: '#1e293b'
    });
};

window.redeemGift = async (id, name) => {
    const ok = await Swal.fire({ title: 'ยืนยันการแลก?', text: name, showCancelButton: true });
    if (ok.isConfirmed) {
        const res = await apiCall("redeemReward", { memberPhone: JSON.parse(localStorage.getItem("loggedInUser")).phone, rewardId: id });
        window.viewTicket(res.refCode, name, 'pending');
    }
};

window.logout = () => { localStorage.clear(); location.reload(); };

// ==========================================
// [3] ADMIN PAGE (สแกนกล้อง + เลือกรูป)
// ==========================================
function handleAdminPage() {
    const app = document.getElementById("app");
    app.innerHTML = `
    <style>body { background: #1e293b; color: white; font-family: 'Kanit', sans-serif; }</style>
    <div class="container py-4" style="max-width: 600px;">
        <h4 class="text-center fw-bold mb-4">LuckyShop24 Admin</h4>
        <div class="card p-4 shadow-lg border-0 mb-4" style="border-radius:30px; color:#333;">
            <div class="input-group mb-4 shadow-sm" style="border-radius:15px; overflow:hidden;">
                <button class="btn btn-primary px-4" id="btnAdminScan"><i class="bi bi-qr-code-scan"></i></button>
                <input type="text" id="adminInp" class="form-control border-0 bg-light" placeholder="เบอร์โทร หรือ รหัส RWD-...">
                <button class="btn btn-dark px-4 fw-bold" id="btnAdminSearch">ค้นหา</button>
            </div>
            <div id="adminRes" class="d-none p-4 rounded-4 bg-light text-center"></div>
        </div>
        <div class="card p-4 shadow-lg border-0" style="border-radius:30px; color:#333;">
            <h6 class="fw-bold mb-3 text-success">เพิ่มของรางวัล (Cash Required)</h6>
            <input type="text" id="rn" class="form-control mb-2 rounded-3" placeholder="ชื่อรางวัล" required>
            <div class="row g-2 mb-3">
                <div class="col-6"><input type="number" id="rp" class="form-control" placeholder="แต้ม" required></div>
                <div class="col-6"><input type="number" id="rc" class="form-control" placeholder="เงินเพิ่ม" value="0"></div>
            </div>
            <button class="btn btn-success w-100 fw-bold rounded-pill" id="btnAddR">บันทึกรางวัล</button>
        </div>
    </div>`;

    document.getElementById("btnAdminScan").onclick = () => {
        Swal.fire({
            title: 'สแกน QR Code / เลือกรูปภาพ',
            html: '<div id="reader" style="width:100%; border-radius:20px; overflow:hidden; background:#000;"></div><input type="file" id="fi" accept="image/*" class="form-control mt-3">',
            showCancelButton: true, showConfirmButton: false,
            didOpen: () => {
                const scanner = new Html5Qrcode("reader");
                const onDone = (t) => { scanner.stop().then(() => { document.getElementById("adminInp").value = t; Swal.close(); document.getElementById("btnAdminSearch").click(); }); };
                scanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 250 }, onDone);
                document.getElementById("fi").onchange = e => { if (e.target.files[0]) scanner.scanFile(e.target.files[0], true).then(onDone); };
            }
        });
    };

    document.getElementById("btnAdminSearch").onclick = async () => {
        const val = document.getElementById("adminInp").value.trim();
        if (!val) return;
        if (val.toUpperCase().startsWith("RWD-")) {
            const ok = await Swal.fire({ title: 'ยืนยันใช้คูปอง?', text: val, showCancelButton: true, confirmButtonColor: '#10b981' });
            if (ok.isConfirmed) { await apiCall("useCoupon", { code: val }); Swal.fire('สำเร็จ', 'คูปองถูกใช้แล้ว', 'success'); }
        } else {
            const user = await apiCall("searchUser", { phone: val });
            const resArea = document.getElementById("adminRes");
            resArea.classList.remove("d-none");
            resArea.innerHTML = `<h5>${user.firstName} ${user.lastName}</h5><h1 class="text-primary fw-bold">${user.totalPoints}</h1>
                <div class="mt-3"><input type="number" id="pts" class="form-control mb-2" placeholder="+/- แต้ม"><button class="btn btn-success w-100" id="btnUpdate">บันทึก</button></div>`;
            document.getElementById("btnUpdate").onclick = async () => {
                await apiCall("managePoints", { memberPhone: user.phone, pointsChange: document.getElementById("pts").value, reason: "โดย Admin" });
                Swal.fire('สำเร็จ', 'ปรับแต้มแล้ว', 'success');
            };
        }
    };
}
