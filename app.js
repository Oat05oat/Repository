const GAS_URL = "https://script.google.com/macros/s/AKfycbwz_WIhmE84bYpcTkMrE6tK5J3SQDlxDH3W5Dv3Pq3P7kWxVxegU5RNp0x-QmSCcsHspw/exec";

// ฟังก์ชันเรียก API
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

function hashPassword(password) { return CryptoJS.SHA256(password).toString(); }

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("admin")) handleAdminPage();
    else if (path.includes("dashboard")) handleDashboardPage();
    else handleLoginPage();
});

// ==========================================
// 1. หน้า LOGIN (ลืมรหัสผ่านทางอีเมล & นโยบาย)
// ==========================================
function handleLoginPage() {
    const forgotLink = document.getElementById("forgotPasswordLink");
    if (forgotLink) {
        forgotLink.onclick = async (e) => {
            e.preventDefault();
            const { value: phone } = await Swal.fire({ title: 'ลืมรหัสผ่าน', input: 'tel', inputPlaceholder: 'เบอร์โทรศัพท์', showCancelButton: true });
            if (phone) {
                await apiCall("requestEmailOtp", { identifier: phone });
                const { value: otp } = await Swal.fire({ title: 'กรอก OTP จากอีเมล', input: 'text' });
                if (otp) {
                    await apiCall("verifyEmailOtp", { identifier: phone, otp: otp });
                    const { value: newPass } = await Swal.fire({ title: 'ตั้งรหัสผ่านใหม่', input: 'password' });
                    if (newPass) {
                        await apiCall("resetPassword", { phone: phone, newHashedPassword: hashPassword(newPass) });
                        Swal.fire("สำเร็จ", "เปลี่ยนรหัสผ่านแล้ว", "success");
                    }
                }
            }
        };
    }
}

// ==========================================
// 2. หน้าลูกค้า DASHBOARD (แก้ปุ่มนิ่ง + ดูคูปอง QR)
// ==========================================
async function handleDashboardPage() {
    const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    if (!userStr) { window.location.href = "index.html"; return; }
    const loggedInUser = JSON.parse(userStr);
    
    // โหลดข้อมูล
    const data = await apiCall("getFullDashboardData", { phone: loggedInUser.phone });
    const { user, rewards, notifications } = data;
    const app = document.getElementById("app");
    const cleanPhone = user.phone.replace(/'/g, '');

    // ปรับแต่ง UI ให้กลับมาสวย
    app.classList.remove("justify-content-center", "align-items-center");
    app.innerHTML = `
    <style>
        body { background: linear-gradient(180deg, #556677 0%, #f4f6f8 300px) !important; }
        .noti-btn { position: absolute; top: 15px; right: 15px; background: #fff; padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; cursor:pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.1); z-index:100; }
        .profile-card { text-align: center; margin-top: 20px; margin-bottom: 20px; }
        .avatar { width: 85px; height: 85px; background: #fff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 2rem; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .clean-card { background: #fff; border-radius: 20px; padding: 20px; margin-bottom: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
        .bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; background: #fff; display: flex; border-top: 1px solid #eee; z-index: 1000; padding: 5px 0; }
        .nav-item { flex: 1; text-align: center; color: #aaa; cursor: pointer; font-size: 0.75rem; }
        .nav-item.active { color: #3b4b5b; font-weight: bold; }
        .nav-item i { font-size: 1.4rem; display: block; }
        .section { display: none; padding-bottom: 80px; width: 100%; max-width: 500px; margin: 0 auto; }
        .section.active { display: block; animation: fadeIn 0.3s; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    </style>

    <div class="noti-btn" onclick="showNotis()"><i class="bi bi-bell-fill text-warning"></i> ${notifications.length}</div>
    
    <div class="profile-card">
        <div class="avatar">${user.firstName[0].toUpperCase()}</div>
        <h5 class="mt-2 fw-bold text-dark">${user.firstName} ${user.lastName}</h5>
    </div>

    <section id="tab-home" class="section active">
        <div class="clean-card text-center py-4">
            <p class="text-muted small mb-0">พอยท์สะสม</p>
            <h1 style="font-size: 3.5rem; font-weight: 800; color: #3b4b5b;">${user.totalPoints}</h1>
        </div>
        <div class="clean-card text-center">
            <p class="fw-bold mb-3">สแกนเพื่อสะสมแต้ม</p>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cleanPhone}" style="width:130px;">
            <p class="mt-3 fw-bold mb-0">${cleanPhone}</p>
        </div>
    </section>

    <section id="tab-rewards" class="section">
        <h6 class="fw-bold mb-3 text-white">ของรางวัล</h6>
        <div class="row g-2">
            ${rewards.map(r => `
                <div class="col-6">
                    <div class="clean-card p-3 h-100 text-center">
                        <div class="fw-bold text-truncate small">${r.name}</div>
                        <button class="btn btn-sm btn-dark w-100 rounded-pill mt-2" onclick="redeemGift('${r.rewardId}','${r.name}')">${r.pointsRequired} P</button>
                    </div>
                </div>
            `).join("")}
        </div>
    </section>

    <section id="tab-history" class="section">
        <h6 class="fw-bold mb-3 text-white">ประวัติรายการ</h6>
        ${user.pointsHistory.map(h => `
            <div class="clean-card p-3 mb-2 d-flex justify-content-between align-items-center" 
                 style="cursor:${h.refCode ? 'pointer' : 'default'}" 
                 onclick="${h.refCode ? `viewCoupon('${h.refCode}','${h.reason}','${h.status}')` : ''}">
                <div><b>${h.reason}</b><br><small class="text-muted">${new Date(h.timestamp).toLocaleDateString('th-TH')}</small></div>
                <div class="text-end">
                    <span class="fw-bold ${h.pointsChange > 0 ? 'text-success' : 'text-danger'}">${h.pointsChange}</span>
                    ${h.refCode ? '<br><small class="text-primary">ดู QR</small>' : ''}
                </div>
            </div>
        `).join("")}
    </section>

    <section id="tab-profile" class="section">
        <div class="clean-card p-0 overflow-hidden">
            <div class="p-3 border-bottom" onclick="editProfile('${user.email}')"><i class="bi bi-envelope me-2"></i> แก้ไขอีเมล</div>
            <div class="p-3 text-danger fw-bold" onclick="logout()"><i class="bi bi-box-arrow-right me-2"></i> ออกจากระบบ</div>
        </div>
    </section>

    <nav class="bottom-nav">
        <div class="nav-item active" onclick="switchTab('tab-home', this)"><i class="bi bi-house-door-fill"></i>หน้าแรก</div>
        <div class="nav-item" onclick="switchTab('tab-rewards', this)"><i class="bi bi-gift-fill"></i>คูปอง</div>
        <div class="nav-item" onclick="switchTab('tab-history', this)"><i class="bi bi-clock-history"></i>ประวัติ</div>
        <div class="nav-item" onclick="switchTab('tab-profile', this)"><i class="bi bi-person-fill"></i>โปรไฟล์</div>
    </nav>`;

    // ฟังก์ชันเสริมใน Dashboard
    window.switchTab = (id, el) => {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        el.classList.add('active');
    };

    window.showNotis = () => {
        let h = notifications.map(n => `<div class="p-2 border-bottom small">${n.message}</div>`).join("");
        Swal.fire({ title: 'แจ้งเตือน', html: h || 'ไม่มีข้อมูล', showCloseButton: true, showConfirmButton: false });
    };

    window.viewCoupon = (code, name, status) => {
        const qr = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${code}`;
        Swal.fire({
            title: 'คูปองของคุณ',
            html: `<div class="p-3 bg-light rounded"><b>${name}</b><br><img src="${qr}" class="my-3 p-2 bg-white border" style="width:150px;"><br><div class="p-2 border border-dashed rounded fw-bold fs-4">${code}</div><p class="mt-2 fw-bold ${status==='used'?'text-success':'text-warning'}">${status==='used'?'ใช้แล้ว':'รอใช้งาน'}</p></div>`,
            confirmButtonText: 'ปิด'
        });
    };

    window.redeemGift = async (id, name) => {
        const ok = await Swal.fire({ title: 'แลกของรางวัล?', text: name, showCancelButton: true });
        if (ok.isConfirmed) {
            const res = await apiCall("redeemReward", { memberPhone: loggedInUser.phone, rewardId: id });
            window.viewCoupon(res.refCode, name, 'pending');
        }
    };
    
    window.logout = () => { localStorage.clear(); sessionStorage.clear(); window.location.href = "index.html"; };
}

// ==========================================
// 3. หน้า ADMIN (สแกนได้จริง + แนบไฟล์ได้ + แก้เบอร์)
// ==========================================
function handleAdminPage() {
    const app = document.getElementById("app");
    app.classList.remove("justify-content-center", "align-items-center");
    app.innerHTML = `
    <style>body { background: #556677 !important; }</style>
    <div class="container py-4" style="max-width: 600px;">
        <h4 class="text-center fw-bold mb-4 text-white">LuckyShop24 Admin</h4>
        <div class="card p-4 shadow-lg border-0 mb-4" style="border-radius:24px;">
            <div class="input-group mb-3">
                <button class="btn btn-primary" id="btnScan"><i class="bi bi-qr-code-scan"></i> สแกน</button>
                <input type="text" id="adminInp" class="form-control" placeholder="เบอร์โทร หรือ รหัสคูปอง">
                <button class="btn btn-dark" id="btnSearch">ค้นหา</button>
            </div>
            <div id="adminRes" class="d-none p-3 bg-light rounded-3 border"></div>
        </div>
        
        <div class="card p-4 shadow-lg border-0" style="border-radius:24px;">
            <h6 class="fw-bold mb-3">เพิ่มรางวัลใหม่</h6>
            <input type="text" id="addName" class="form-control mb-2" placeholder="ชื่อรางวัล">
            <input type="number" id="addPts" class="form-control mb-2" placeholder="พอยท์ที่ใช้">
            <input type="number" id="addCash" class="form-control mb-3" placeholder="เงินสดเพิ่ม (ถ้ามี)" value="0">
            <button class="btn btn-success w-100 fw-bold" id="btnSaveR">บันทึก</button>
        </div>
    </div>`;

    document.getElementById("btnScan").onclick = () => {
        Swal.fire({
            title: 'สแกนคูปอง / ลูกค้า',
            html: `<div id="qr-reader" style="width:100%; border-radius:10px; overflow:hidden;"></div>
                   <input type="file" id="file-qr" accept="image/*" class="form-control mt-3">`,
            showCancelButton: true,
            didOpen: () => {
                const scanner = new Html5Qrcode("qr-reader");
                const onOk = (t) => { scanner.stop(); document.getElementById("adminInp").value = t; Swal.close(); document.getElementById("btnSearch").click(); };
                scanner.start({ facingMode: "environment" }, { fps: 15, qrbox: 250 }, onOk);
                document.getElementById("file-qr").onchange = e => {
                    if (e.target.files[0]) scanner.scanFile(e.target.files[0], true).then(onOk).catch(() => Swal.showValidationMessage("อ่านไม่ได้"));
                };
            }
        });
    };

    document.getElementById("btnSearch").onclick = async () => {
        const val = document.getElementById("adminInp").value;
        if (!val) return;
        if (val.startsWith("RWD-")) {
            const ok = await Swal.fire({ title: 'ยืนยันใช้คูปอง?', text: val, showCancelButton: true });
            if (ok.isConfirmed) { await apiCall("useCoupon", { code: val }); Swal.fire("สำเร็จ", "คูปองถูกใช้แล้ว", "success"); }
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
                    <button class="btn btn-success w-100 mb-2 fw-bold" id="btnUpPt">บันทึกแต้ม</button>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-info flex-fill" onclick="adminOp('changePhone','${user.phone}')">แก้เบอร์</button>
                        <button class="btn btn-sm btn-outline-danger flex-fill" onclick="adminOp('suspendUser','${user.phone}')">ระงับ</button>
                    </div>
                </div>`;
            document.getElementById("btnUpPt").onclick = async () => {
                await apiCall("managePoints", { memberPhone: user.phone, pointsChange: document.getElementById("amt").value, reason: "แอดมินจัดการ" });
                Swal.fire("สำเร็จ", "อัปเดตแต้มแล้ว", "success"); document.getElementById("btnSearch").click();
            };
        }
    };
}

// ฟังก์ชัน Global สำหรับ Admin
window.adminOp = async (act, phone) => {
    if (act === 'changePhone') {
        const { value: newP } = await Swal.fire({ title: 'เบอร์ใหม่', input: 'text', inputValue: phone });
        if (newP) await apiCall("changePhone", { old: phone, new: newP });
    } else {
        const ok = await Swal.fire({ title: 'ระงับบัญชี?', icon: 'warning', showCancelButton: true });
        if (ok.isConfirmed) await apiCall("suspendUser", { phone: phone });
    }
    Swal.fire("สำเร็จ", "ดำเนินการเรียบร้อย", "success");
};
