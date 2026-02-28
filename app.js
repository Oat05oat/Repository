const GAS_URL = "https://script.google.com/macros/s/AKfycbwz_WIhmE84bYpcTkMrE6tK5J3SQDlxDH3W5Dv3Pq3P7kWxVxegU5RNp0x-QmSCcsHspw/exec";

// --- ฟังก์ชันสื่อสาร API ---
async function apiCall(action, payload) {
    if (!Swal.isVisible()) showLoading();
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
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: err.message });
        throw err;
    } finally { Swal.close(); }
}

function showLoading() {
    Swal.fire({ title: 'กำลังประมวลผล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
}

function hashPassword(password) { return CryptoJS.SHA256(password).toString(); }

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("admin")) handleAdminPage();
    else if (path.includes("dashboard")) handleDashboardPage();
    else handleLoginPage();
});

// ==========================================
// 1. หน้าลูกค้า (DASHBOARD) - เน้นสี Navy-White
// ==========================================
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
    const currentDay = new Date().getDay().toString();

    // แยกหมวดหมู่โปรประจำสัปดาห์
    const weeklyRewards = rewards.filter(r => r.category === "โปรประจำสัปดาห์");
    const normalRewards = rewards.filter(r => r.category !== "โปรประจำสัปดาห์");

    app.innerHTML = `
    <style>
        .header-bg { background: linear-gradient(180deg, #1e293b 0%, #334155 100%); height: 220px; position: relative; border-radius: 0 0 40px 40px; }
        .noti-btn { position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); color: white; border:none; padding: 8px 15px; border-radius: 15px; font-weight: 600; font-size: 0.85rem; }
        .profile-section { margin-top: -60px; text-align: center; }
        .avatar { width: 100px; height: 100px; background: white; border-radius: 35px; display: inline-flex; align-items: center; justify-content: center; font-size: 2.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 4px solid #f8fafc; }
        .point-card { background: white; border-radius: 30px; padding: 30px; box-shadow: 0 15px 35px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #f1f5f9; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; background: white; display: flex; padding: 15px 0; box-shadow: 0 -10px 30px rgba(0,0,0,0.03); border-radius: 30px 30px 0 0; z-index: 1000; }
        .nav-item { flex: 1; text-align: center; color: #94a3b8; font-size: 0.8rem; cursor: pointer; transition: 0.3s; }
        .nav-item.active { color: #4f46e5; font-weight: 800; transform: translateY(-5px); }
        .nav-item i { font-size: 1.6rem; display: block; margin-bottom: 2px; }
        .section { display: none; padding: 20px 20px 100px; }
        .section.active { display: block; animation: slideUp 0.4s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .reward-card { background: white; border-radius: 20px; border: 1px solid #f1f5f9; overflow: hidden; height: 100%; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
    </style>

    <div class="header-bg">
        <button class="noti-btn" onclick="showNotis()"><i class="bi bi-bell-fill me-2"></i> ${notifications.length}</button>
    </div>
    
    <div class="profile-section">
        <div class="avatar">${user.firstName[0]}</div>
        <h4 class="mt-3 fw-bold text-dark mb-0">${user.firstName} ${user.lastName}</h4>
        <p class="text-muted small">ID: ${user.memberId}</p>
    </div>

    <div id="main-content">
        <section id="tab-home" class="section active">
            <div class="point-card text-center shadow-sm">
                <p class="text-muted small mb-1 fw-bold">คะแนนสะสมทั้งหมด</p>
                <h1 style="font-size: 4rem; font-weight: 900; color: #1e293b; margin:0;">${user.totalPoints}</h1>
                <div class="mt-3 d-inline-block px-3 py-1 bg-light rounded-pill small fw-bold text-primary">Lucky Member</div>
            </div>
            <div class="point-card text-center">
                <p class="fw-bold mb-3 text-secondary">QR Code สะสมแต้ม</p>
                <div class="bg-light p-3 d-inline-block rounded-4 mb-3 border">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cleanPhone}" style="width:140px;">
                </div>
                <h5 class="fw-bold tracking-widest">${cleanPhone}</h5>
            </div>
        </section>

        <section id="tab-rewards" class="section">
            <h6 class="fw-bold mb-3 text-primary"><i class="bi bi-star-fill"></i> โปรโมชั่นประจำวัน</h6>
            <div class="row g-3 mb-4">
                ${weeklyRewards.map(r => renderReward(r, user.totalPoints, currentDay)).join("")}
            </div>
            <h6 class="fw-bold mb-3 text-primary"><i class="bi bi-gift-fill"></i> รางวัลทั่วไป</h6>
            <div class="row g-3">
                ${normalRewards.map(r => renderReward(r, user.totalPoints, currentDay)).join("")}
            </div>
        </section>

        <section id="tab-history" class="section">
            <h6 class="fw-bold mb-3">ประวัติรายการ</h6>
            ${user.pointsHistory.map(h => `
                <div class="point-card p-3 mb-2 d-flex justify-content-between align-items-center" 
                     onclick="${h.refCode ? `viewTicket('${h.refCode}','${h.reason}','${h.status}')` : ''}"
                     style="cursor:${h.refCode ? 'pointer':'default'};">
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle bg-light d-flex align-items-center justify-content-center me-3" style="width:45px; height:45px;">
                            <i class="bi ${h.pointsChange > 0 ? 'bi-plus-circle text-success' : 'bi-dash-circle text-danger'} fs-5"></i>
                        </div>
                        <div>
                            <b class="d-block text-dark" style="font-size:0.9rem;">${h.reason}</b>
                            <small class="text-muted">${new Date(h.timestamp).toLocaleDateString('th-TH')}</small>
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="fw-bold ${h.pointsChange > 0 ? 'text-success' : 'text-danger'}" style="font-size:1.1rem;">${h.pointsChange > 0 ? '+':''}${h.pointsChange}</span>
                        ${h.refCode ? '<br><span class="badge bg-primary mt-1" style="font-size:0.6rem;">ดู QR</span>' : ''}
                    </div>
                </div>
            `).join("")}
        </section>

        <section id="tab-profile" class="section">
            <div class="point-card p-0 overflow-hidden shadow-sm">
                <div class="p-3 border-bottom d-flex align-items-center" onclick="editEmail('${user.email}')"><i class="bi bi-envelope-check-fill text-primary me-3 fs-5"></i> ข้อมูลอีเมล</div>
                <div class="p-3 border-bottom d-flex align-items-center" onclick="window.open('https://line.me/R/ti/p/@732fqlwh')"><i class="bi bi-headset text-success me-3 fs-5"></i> ติดต่อแอดมิน</div>
                <div class="p-3 d-flex align-items-center text-danger fw-bold" onclick="logout()"><i class="bi bi-box-arrow-right me-3 fs-5"></i> ออกจากระบบ</div>
            </div>
        </section>
    </div>

    <nav class="bottom-nav">
        <div class="nav-item active" onclick="switchTab('tab-home', this)"><i class="bi bi-house-door-fill"></i>หน้าแรก</div>
        <div class="nav-item" onclick="switchTab('tab-rewards', this)"><i class="bi bi-gift-fill"></i>รางวัล</div>
        <div class="nav-item" onclick="switchTab('tab-history', this)"><i class="bi bi-receipt"></i>ประวัติ</div>
        <div class="nav-item" onclick="switchTab('tab-profile', this)"><i class="bi bi-person-fill"></i>บัญชี</div>
    </nav>`;

    window.showNotis = () => {
        let content = notifications.map(n => `<div class="text-start p-3 border-bottom"><small class="text-muted">${new Date(n.timestamp).toLocaleString('th-TH')}</small><p class="mb-0 fw-bold text-dark">${n.message}</p></div>`).join("");
        Swal.fire({ 
            title: 'การแจ้งเตือน', 
            html: `<div style="max-height:400px; overflow-y:auto;">${content || 'ไม่มีแจ้งเตือนใหม่'}</div>`, 
            showCloseButton: true, 
            showConfirmButton: false 
        });
    };
}

function renderReward(r, pts, today) {
    const isAvailable = r.activeDays ? r.activeDays.toString().split(",").includes(today) : true;
    const canRedeem = pts >= r.pointsRequired && isAvailable;
    const cashInfo = r.cashRequired > 0 ? `<br><small class="text-danger fw-bold">+ เงินสด ${r.cashRequired}฿</small>` : "";

    return `
    <div class="col-6">
        <div class="reward-card text-center p-3 d-flex flex-column">
            <b class="text-dark d-block text-truncate small mb-1">${r.name}</b>
            <p class="text-muted mb-3" style="font-size:0.7rem; height:32px; overflow:hidden;">${r.description || 'ไม่มีรายละเอียด'}</p>
            <button class="btn btn-sm w-100 rounded-pill fw-bold" 
                onclick="redeemGift('${r.rewardId}','${r.name}')"
                ${canRedeem ? "" : "disabled"} 
                style="background:${canRedeem ? '#1e293b' : '#f1f5f9'}; color:${canRedeem ? '#fff' : '#94a3b8'}; border:none; padding:8px 0;">
                ใช้ ${r.pointsRequired} P ${cashInfo}
            </button>
            ${!isAvailable ? '<div class="mt-2 text-danger" style="font-size:0.6rem;">ไม่เปิดแลกวันนี้</div>' : ''}
        </div>
    </div>`;
}

// ==========================================
// 2. หน้าแอดมิน (ADMIN) - ปรับปรุงระบบสแกน & แก้บั๊ก
// ==========================================
function handleAdminPage() {
    const app = document.getElementById("app");
    app.innerHTML = `
    <style>body { background: #1e293b; color: white; font-family: 'Kanit', sans-serif; }</style>
    <div class="container py-4" style="max-width: 600px;">
        <h4 class="text-center fw-bold mb-4 mt-3">Admin LuckyShop24</h4>
        
        <div class="card p-4 shadow-lg border-0 mb-4" style="border-radius:30px; color:#334155;">
            <div class="input-group mb-4 shadow-sm" style="border-radius:15px; overflow:hidden;">
                <button class="btn btn-primary px-4" id="scanBtn"><i class="bi bi-qr-code-scan"></i></button>
                <input type="text" id="adminInp" class="form-control border-0 bg-light" placeholder="เบอร์โทร หรือ รหัสคูปอง RWD-...">
                <button class="btn btn-dark px-4" id="goSearch">ค้นหา</button>
            </div>
            <div id="adminRes" class="d-none p-4 rounded-4 bg-light border-0 text-center mb-2"></div>
            <form id="ptForm" class="d-none mt-3">
                <div class="row g-2">
                    <div class="col-4"><input type="number" id="pts" class="form-control rounded-3" placeholder="+/-" required></div>
                    <div class="col-8"><input type="text" id="res" class="form-control rounded-3" placeholder="ระบุเหตุผล" required></div>
                </div>
                <button type="submit" class="btn btn-success w-100 mt-3 fw-bold rounded-pill shadow">บันทึกพอยท์</button>
            </form>
        </div>

        <div class="card p-4 shadow-lg border-0" style="border-radius:30px; color:#334155;">
            <h6 class="fw-bold mb-3"><i class="bi bi-plus-circle-fill text-success"></i> เพิ่มรางวัลใหม่</h6>
            <form id="addR">
                <input type="text" id="rn" class="form-control mb-2 rounded-3" placeholder="ชื่อรางวัล/สินค้า" required>
                <div class="row g-2 mb-2">
                    <div class="col-6"><input type="number" id="rp" class="form-control rounded-3" placeholder="ใช้แต้ม" required></div>
                    <div class="col-6"><input type="number" id="rc" class="form-control rounded-3" placeholder="เพิ่มเงิน(ถ้ามี)" value="0"></div>
                </div>
                <select id="rcat" class="form-select mb-3 rounded-3" required>
                    <option value="ส่วนลดทั่วไป">ส่วนลดทั่วไป</option>
                    <option value="สินค้าพรีเมียม">สินค้าพรีเมียม</option>
                    <option value="แลกเงินสด">แลกเงินสด</option>
                    <option value="โปรประจำสัปดาห์">โปรประจำสัปดาห์</option>
                </select>
                <button type="submit" class="btn btn-success w-100 fw-bold rounded-pill">เพิ่มรางวัลเข้าระบบ</button>
            </form>
        </div>
        <button class="btn btn-link text-white-50 w-100 mt-4" onclick="logout()">ออกจากระบบ Admin</button>
    </div>`;

    document.getElementById("scanBtn").onclick = () => {
        Swal.fire({
            title: 'สแกนรหัส LuckyShop',
            html: '<div id="reader" style="width:100%; border-radius:15px; overflow:hidden;"></div><input type="file" id="f" accept="image/*" class="form-control mt-3 shadow-sm">',
            showCancelButton: true, showConfirmButton: false,
            didOpen: () => {
                const scanner = new Html5Qrcode("reader");
                const onDone = (t) => { scanner.stop(); document.getElementById("adminInp").value = t; Swal.close(); document.getElementById("goSearch").click(); };
                scanner.start({ facingMode: "environment" }, { fps: 15, qrbox: 250 }, onDone);
                document.getElementById("f").onchange = e => { if (e.target.files[0]) scanner.scanFile(e.target.files[0], true).then(onDone).catch(() => Swal.showValidationMessage("อ่านภาพไม่ได้")); };
            }
        });
    };

    document.getElementById("goSearch").onclick = async () => {
        const val = document.getElementById("adminInp").value.trim();
        if (!val) return;
        if (val.toUpperCase().startsWith("RWD-")) {
            const ok = await Swal.fire({ title: 'ยืนยันใช้คูปอง?', text: val, showCancelButton: true, confirmButtonColor: '#10b981' });
            if (ok.isConfirmed) { await apiCall("useCoupon", { code: val }); Swal.fire('สำเร็จ', 'คูปองถูกใช้งานแล้ว', 'success'); document.getElementById("adminInp").value = ""; }
        } else {
            const user = await apiCall("searchUser", { phone: val });
            const resArea = document.getElementById("adminRes");
            resArea.classList.remove("d-none");
            resArea.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div class="text-start"><b>${user.firstName} ${user.lastName}</b><br><small class="text-muted">${user.phone}</small></div>
                    <div class="h3 text-primary fw-bold mb-0">${user.totalPoints}</div>
                </div>
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-sm btn-outline-primary flex-fill rounded-pill" onclick="adminQuickOp('changePhone','${user.phone}')">แก้เบอร์</button>
                    <button class="btn btn-sm btn-outline-danger flex-fill rounded-pill" onclick="adminQuickOp('suspendUser','${user.phone}')">ระงับ</button>
                </div>`;
            document.getElementById("ptForm").classList.remove("d-none");
        }
    };

    document.getElementById("ptForm").onsubmit = async (e) => {
        e.preventDefault();
        await apiCall("managePoints", { memberPhone: document.getElementById("adminInp").value, pointsChange: document.getElementById("pts").value, reason: document.getElementById("res").value });
        Swal.fire('สำเร็จ', 'บันทึกคะแนนแล้ว', 'success'); document.getElementById("goSearch").click();
    };
}

// --- ฟังก์ชันเสริม Global ---
window.switchTab = (id, el) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    el.classList.add('active');
};

window.viewTicket = (code, name, status) => {
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${code}`;
    Swal.fire({
        title: 'คูปอง LuckyShop',
        html: `<div class="p-3 bg-light rounded-4 border">
                <p class="fw-bold text-dark mb-1">${name}</p>
                <img src="${qr}" class="my-3 p-2 bg-white border" style="width:180px;">
                <div class="p-2 border border-dashed rounded fw-bold fs-4 bg-white">${code}</div>
                <p class="mt-3 fw-bold ${status==='used'?'text-success':'text-warning'}">${status==='used'?'ใช้แล้ว':'รอใช้สิทธิ์'}</p>
            </div>`,
        confirmButtonText: 'ปิดหน้าต่าง'
    });
};

window.redeemGift = async (id, name) => {
    const ok = await Swal.fire({ title: 'แลกรางวัลนี้?', text: name, showCancelButton: true });
    if (ok.isConfirmed) {
        const res = await apiCall("redeemReward", { memberPhone: JSON.parse(localStorage.getItem("loggedInUser")).phone, rewardId: id });
        window.viewTicket(res.refCode, name, 'pending');
    }
};

window.logout = () => { localStorage.clear(); sessionStorage.clear(); window.location.href = "index.html"; };
