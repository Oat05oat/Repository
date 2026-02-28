const GAS_URL = "https://script.google.com/macros/s/AKfycbwz_WIhmE84bYpcTkMrE6tK5J3SQDlxDH3W5Dv3Pq3P7kWxVxegU5RNp0x-QmSCcsHspw/exec";

// --- ฟังก์ชันสื่อสารหลังบ้าน ---
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

// --- เริ่มทำงานตามหน้าเว็บ ---
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("admin")) handleAdminPage();
    else if (path.includes("dashboard")) handleDashboardPage();
    else handleLoginPage();
});

// ==========================================
// [1] ส่วนของลูกค้า (Dashboard)
// ==========================================
async function handleDashboardPage() {
    const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    if (!userStr) { window.location.href = "index.html"; return; }
    const user = JSON.parse(userStr);
    
    const data = await apiCall("getFullDashboardData", { phone: user.phone });
    renderDashboard(data);
}

function renderDashboard(data) {
    const { user, rewards, notifications } = data;
    const app = document.getElementById("app");
    const cleanPhone = user.phone.replace(/'/g, '');

    app.innerHTML = `
    <style>
        .noti-btn { position: absolute; top: 15px; right: 15px; background: #fff; padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; cursor:pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.1); z-index:100; }
        .profile-header { text-align: center; margin-top: 50px; margin-bottom: 25px; }
        .avatar-circle { width: 90px; height: 90px; background: #fff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 2.2rem; border: 4px solid #fff; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .clean-card { background: #fff; border-radius: 24px; padding: 25px; margin-bottom: 20px; box-shadow: 0 5px 20px rgba(0,0,0,0.05); border:none; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; background: #fff; display: flex; border-top: 1px solid #eee; z-index: 1000; padding: 8px 0; }
        .nav-item { flex: 1; text-align: center; color: #aaa; cursor: pointer; font-size: 0.8rem; }
        .nav-item.active { color: #3b4b5b; font-weight: bold; }
        .nav-item i { font-size: 1.6rem; display: block; }
        .mobile-section { display: none; padding: 20px; padding-bottom: 100px; max-width: 500px; margin: 0 auto; }
        .mobile-section.active { display: block; animation: fadeIn 0.3s; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    </style>

    <div class="noti-btn" onclick="showNotis()"><i class="bi bi-bell-fill text-warning"></i> ${notifications.length}</div>
    
    <div class="profile-header">
        <div class="avatar-circle">${user.firstName[0].toUpperCase()}</div>
        <h5 class="mt-2 fw-bold text-dark">${user.firstName} ${user.lastName}</h5>
        <p class="text-muted small">สมาชิกหมายเลข: ${user.memberId || '-'}</p>
    </div>

    <section id="tab-home" class="mobile-section active">
        <div class="clean-card text-center py-4">
            <p class="text-muted small mb-1">พอยท์สะสมของคุณ</p>
            <h1 style="font-size: 3.5rem; font-weight: 800; color: #3b4b5b;">${user.totalPoints}</h1>
        </div>
        <div class="clean-card text-center">
            <p class="fw-bold mb-3">สแกนเพื่อสะสม/แลกพอยท์</p>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cleanPhone}" style="width:130px;">
            <p class="mt-3 fw-bold mb-0">${cleanPhone}</p>
        </div>
    </section>

    <section id="tab-rewards" class="mobile-section">
        <h6 class="fw-bold mb-3 text-white">ของรางวัลสำหรับคุณ</h6>
        <div class="row g-2">
            ${rewards.map(r => `
                <div class="col-6 mb-2">
                    <div class="clean-card p-3 h-100 text-center border-0 shadow-sm">
                        <div class="fw-bold text-truncate">${r.name}</div>
                        <button class="btn btn-sm btn-dark w-100 rounded-pill mt-2" onclick="redeemGift('${r.rewardId}','${r.name}')">${r.pointsRequired} พอยท์</button>
                    </div>
                </div>
            `).join("")}
        </div>
    </section>

    <section id="tab-history" class="mobile-section">
        <h6 class="fw-bold mb-3 text-white">ประวัติรายการแลก</h6>
        ${user.pointsHistory.map(h => `
            <div class="clean-card p-3 mb-2 d-flex justify-content-between align-items-center" 
                 style="cursor:${h.refCode ? 'pointer' : 'default'}"
                 onclick="${h.refCode ? `viewQr('${h.refCode}','${h.reason}','${h.status}')` : ''}">
                <div><b>${h.reason}</b><br><small class="text-muted">${new Date(h.timestamp).toLocaleDateString('th-TH')}</small></div>
                <div class="text-end">
                    <span class="fw-bold ${h.pointsChange > 0 ? 'text-success' : 'text-danger'}">${h.pointsChange}</span>
                    ${h.refCode ? '<br><small class="text-primary fw-bold">คลิกดู QR</small>' : ''}
                </div>
            </div>
        `).join("")}
    </section>

    <section id="tab-profile" class="mobile-section">
        <div class="clean-card p-0 overflow-hidden">
            <div class="p-3 border-bottom" onclick="editProfile('${user.email}')"><i class="bi bi-envelope-at me-2 text-primary"></i> แก้ไขอีเมล</div>
            <div class="p-3 border-bottom" onclick="window.open('https://line.me/R/ti/p/@your-id')"><i class="bi bi-headset me-2 text-success"></i> ติดต่อแอดมิน</div>
            <div class="p-3 text-danger fw-bold" onclick="logout()"><i class="bi bi-box-arrow-right me-2"></i> ออกจากระบบ</div>
        </div>
    </section>

    <nav class="bottom-nav">
        <div class="nav-item active" onclick="switchTab('tab-home', this)"><i class="bi bi-house-door-fill"></i>หน้าแรก</div>
        <div class="nav-item" onclick="switchTab('tab-rewards', this)"><i class="bi bi-gift-fill"></i>คูปอง</div>
        <div class="nav-item" onclick="switchTab('tab-history', this)"><i class="bi bi-clock-history"></i>ประวัติ</div>
        <div class="nav-item" onclick="switchTab('tab-profile', this)"><i class="bi bi-person-fill"></i>โปรไฟล์</div>
    </nav>`;
}

// ==========================================
// [2] ส่วนของแอดมิน (Admin)
// ==========================================
function handleAdminPage() {
    const app = document.getElementById("app");
    app.innerHTML = `
    <style>body { background: #556677 !important; color: #fff; }</style>
    <div class="container py-4" style="max-width: 600px;">
        <h3 class="text-center fw-bold mb-4">Admin LuckyShop24</h3>
        
        <div class="card p-4 shadow-lg border-0 mb-4" style="border-radius:24px; color:#333;">
            <div class="input-group mb-4 shadow-sm" style="border-radius:15px; overflow:hidden;">
                <button class="btn btn-primary px-4" id="adminScanBtn"><i class="bi bi-qr-code-scan"></i> สแกน</button>
                <input type="text" id="adminInp" class="form-control border-0 bg-light" placeholder="เบอร์โทร หรือ รหัสคูปอง RWD-...">
                <button class="btn btn-dark px-4" id="adminSearchBtn">ค้นหา</button>
            </div>
            <div id="adminRes" class="d-none p-3 bg-light rounded-4 border mb-2"></div>
            <form id="ptForm" class="d-none p-3 border rounded-4 bg-white mt-3">
                <h6 class="fw-bold mb-3 text-muted">จัดการคะแนน</h6>
                <div class="row g-2">
                    <div class="col-4"><input type="number" id="ptChange" class="form-control rounded-3" placeholder="+/-" required></div>
                    <div class="col-8"><input type="text" id="ptReason" class="form-control rounded-3" placeholder="ระบุเหตุผล" required></div>
                </div>
                <button type="submit" class="btn btn-success w-100 mt-3 fw-bold rounded-pill shadow-sm">บันทึกพอยท์</button>
            </form>
        </div>

        <div class="card p-4 shadow-lg border-0" style="border-radius:24px; color:#333;">
            <h6 class="fw-bold mb-4 text-success"><i class="bi bi-plus-circle me-2"></i>เพิ่มรางวัลใหม่</h6>
            <form id="rewardForm">
                <input type="text" id="rn" class="form-control mb-2" placeholder="ชื่อรางวัล" required>
                <div class="row g-2 mb-2">
                    <div class="col-6"><input type="number" id="rp" class="form-control" placeholder="พอยท์ที่ใช้" required></div>
                    <div class="col-6"><input type="number" id="rc" class="form-control" placeholder="เงินเพิ่ม (ถ้ามี)" value="0"></div>
                </div>
                <select id="rcat" class="form-select mb-3" required>
                    <option value="ส่วนลดทั่วไป">ส่วนลดทั่วไป</option>
                    <option value="ส่วนลดสินค้าพรีเมี่ยม">ส่วนลดสินค้าพรีเมี่ยม</option>
                    <option value="แลกเงินสด">แลกเงินสด</option>
                    <option value="เสริมประกัน">เสริมประกัน</option>
                    <option value="โปรประจำสัปดาห์">โปรประจำสัปดาห์ (ระบุวัน)</option>
                </select>
                <button type="submit" class="btn btn-success w-100 fw-bold rounded-pill">บันทึกรางวัล</button>
            </form>
        </div>
    </div>`;

    setupAdminActions();
}

function setupAdminActions() {
    // ปุ่มสแกนแบบอัปเกรด (รองรับทั้งกล้องและรูปภาพ)
    document.getElementById("adminScanBtn").onclick = () => {
        Swal.fire({
            title: 'สแกน QR Code',
            html: `<div id="qr-reader" style="width:100%; border-radius:15px; overflow:hidden; background:#000;"></div>
                   <input type="file" id="qr-file" accept="image/*" class="form-control mt-3">`,
            showCancelButton: true, showConfirmButton: false,
            didOpen: () => {
                const scanner = new Html5Qrcode("qr-reader");
                const onOk = (t) => { scanner.stop(); document.getElementById("adminInp").value = t; Swal.close(); document.getElementById("adminSearchBtn").click(); };
                scanner.start({ facingMode: "environment" }, { fps: 15, qrbox: 250 }, onOk);
                document.getElementById("qr-file").onchange = e => {
                    if (e.target.files[0]) scanner.scanFile(e.target.files[0], true).then(onOk).catch(() => Swal.showValidationMessage("อ่านภาพไม่ได้"));
                };
            }
        });
    };

    // ปุ่มค้นหา
    document.getElementById("adminSearchBtn").onclick = async () => {
        const val = document.getElementById("adminInp").value.trim();
        if (!val) return;

        if (val.toUpperCase().startsWith("RWD-")) {
            const ok = await Swal.fire({ title: 'ยืนยันใช้คูปอง?', text: val, showCancelButton: true, confirmButtonColor: '#10b981' });
            if (ok.isConfirmed) { await apiCall("useCoupon", { code: val }); Swal.fire('สำเร็จ', 'คูปองใช้งานแล้ว', 'success'); }
        } else {
            const user = await apiCall("searchUser", { phone: val });
            const resArea = document.getElementById("adminRes");
            resArea.classList.remove("d-none");
            resArea.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div><b>${user.firstName}</b><br><small class="text-muted">${user.phone}</small></div>
                    <div class="h4 text-primary fw-bold">${user.totalPoints}</div>
                </div>
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-sm btn-outline-primary flex-fill rounded-pill" onclick="adminQuickOp('changePhone','${user.phone}')">แก้เบอร์</button>
                    <button class="btn btn-sm btn-outline-danger flex-fill rounded-pill" onclick="adminQuickOp('suspendUser','${user.phone}')">ระงับ</button>
                </div>`;
            document.getElementById("ptForm").classList.remove("d-none");
        }
    };
}

// ==========================================
// [3] ฟังก์ชัน Global (เรียกใช้จาก HTML)
// ==========================================
window.switchTab = (id, el) => {
    document.querySelectorAll('.mobile-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    el.classList.add('active');
};

window.viewQr = (code, name, status) => {
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(code)}`;
    Swal.fire({
        title: '<h5 class="fw-bold">รายละเอียดของรางวัล</h5>',
        html: `<div class="p-3 bg-light rounded text-center">
                <p><b>${name}</b></p>
                <img src="${qr}" class="my-3 p-2 bg-white border" style="width:160px;"><br>
                <div class="p-2 border border-dashed rounded fw-bold fs-4">${code}</div>
                <p class="mt-2 fw-bold ${status==='used'?'text-success':'text-warning'}">${status==='used'?'ใช้งานแล้ว':'รอใช้สิทธิ์'}</p>
               </div>`,
        showCloseButton: true, confirmButtonText: 'ปิด'
    });
};

window.redeemGift = async (id, name) => {
    const ok = await Swal.fire({ title: 'ยืนยันการแลก?', text: name, showCancelButton: true });
    if (ok.isConfirmed) {
        const res = await apiCall("redeemReward", { memberPhone: JSON.parse(localStorage.getItem("loggedInUser")).phone, rewardId: id });
        window.viewQr(res.refCode, name, 'pending');
    }
};

window.logout = () => { localStorage.clear(); sessionStorage.clear(); window.location.href = "index.html"; };
