const GAS_URL = "https://script.google.com/macros/s/AKfycbwz_WIhmE84bYpcTkMrE6tK5J3SQDlxDH3W5Dv3Pq3P7kWxVxegU5RNp0x-QmSCcsHspw/exec";

// --- ฟังก์ชันพื้นฐาน ---
async function apiCall(action, payload) {
    showLoading();
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

function showLoading() {
    Swal.fire({ title: 'กำลังประมวลผล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
}

function hashPassword(password) { return CryptoJS.SHA256(password).toString(); }

// --- การควบคุมหน้าเว็บ ---
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("admin")) handleAdminPage();
    else if (path.includes("dashboard")) handleDashboardPage();
    else handleLoginPage();
});

// ==========================================
// 1. หน้า LOGIN (ลืมรหัสผ่าน / นโยบาย / OTP)
// ==========================================
function handleLoginPage() {
    // นโยบายความเป็นส่วนตัว
    const policyLink = document.getElementById("viewPolicyLink");
    if (policyLink) {
        policyLink.onclick = (e) => {
            e.preventDefault();
            Swal.fire({
                title: 'นโยบายความเป็นส่วนตัว',
                html: `<div style="text-align:left; font-size:0.9rem;">
                    1. การเก็บรวบรวมข้อมูล: ชื่อ เบอร์โทร และอีเมล<br>
                    2. การใช้งานข้อมูล: จัดการพอยท์ แลกรางวัล และความปลอดภัย<br>
                    3. การรักษาความปลอดภัย: ไม่เปิดเผยข้อมูลแก่บุคคลที่สาม
                </div>`,
                confirmButtonColor: '#3b4b5b'
            });
        };
    }

    // ลืมรหัสผ่าน
    const forgotLink = document.getElementById("forgotPasswordLink");
    if (forgotLink) {
        forgotLink.onclick = async (e) => {
            e.preventDefault();
            const { value: phone } = await Swal.fire({ title: 'ลืมรหัสผ่าน', input: 'tel', inputPlaceholder: 'กรอกเบอร์โทรศัพท์', showCancelButton: true });
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

    // Login ปกติ
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const user = await apiCall("login", { 
                phone: document.getElementById("phone").value, 
                hashedPassword: hashPassword(document.getElementById("password").value) 
            });
            const storage = document.getElementById("rememberMe").checked ? localStorage : sessionStorage;
            storage.setItem("loggedInUser", JSON.stringify(user.user));
            window.location.href = user.user.isAdmin ? "admin.html" : "dashboard.html";
        };
    }
}

// ==========================================
// 2. หน้าลูกค้า (Dashboard สวยงาม + คูปอง QR)
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

    app.innerHTML = `
    <style>
        body { background: linear-gradient(180deg, #556677 0%, #f4f6f8 350px); font-family: 'Kanit', sans-serif; }
        .clean-card { background: #fff; border-radius: 20px; padding: 20px; margin-bottom: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); border:none; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; background: #fff; display: flex; border-top: 1px solid #eee; z-index: 1000; }
        .nav-item { flex: 1; text-align: center; padding: 12px; color: #aaa; cursor: pointer; }
        .nav-item.active { color: #3b4b5b; font-weight: bold; }
        .mobile-section { display: none; padding: 20px; padding-bottom: 100px; }
        .mobile-section.active { display: block; }
    </style>

    <div style="position:relative; padding-top:50px;">
        <div class="text-center mb-4">
            <div style="width:85px; height:85px; background:#fff; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:2rem; box-shadow:0 4px 12px rgba(0,0,0,0.1); border:3px solid #fff;">${user.firstName[0]}</div>
            <h5 class="mt-2 fw-bold text-dark">${user.firstName} ${user.lastName}</h5>
        </div>

        <section id="tab-home" class="mobile-section active">
            <div class="clean-card text-center py-4">
                <p class="text-muted small mb-0">พอยท์สะสม</p>
                <h1 style="font-size: 3.5rem; font-weight: 800; color: #3b4b5b;">${user.totalPoints}</h1>
            </div>
            <div class="clean-card text-center">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cleanPhone}" style="width:140px;">
                <p class="mt-3 fw-bold mb-0">${cleanPhone}</p>
            </div>
        </section>

        <section id="tab-rewards" class="mobile-section">
            <h6 class="fw-bold mb-3">แลกของรางวัล</h6>
            <div class="row g-2">
                ${rewards.map(r => `
                    <div class="col-6 mb-2">
                        <div class="clean-card p-3 h-100 text-center">
                            <div class="fw-bold text-truncate">${r.name}</div>
                            <button class="btn btn-sm btn-dark w-100 rounded-pill mt-2" onclick="redeemGift('${r.rewardId}','${r.name}')">${r.pointsRequired} พอยท์</button>
                        </div>
                    </div>
                `).join("")}
            </div>
        </section>

        <section id="tab-history" class="mobile-section">
            <h6 class="fw-bold mb-3">ประวัติรายการ</h6>
            ${user.pointsHistory.map(h => `
                <div class="clean-card p-3 mb-2 d-flex justify-content-between align-items-center" 
                     style="cursor:${h.refCode ? 'pointer' : 'default'}" 
                     onclick="${h.refCode ? `viewQr('${h.refCode}','${h.reason}','${h.status}')` : ''}">
                    <div><b>${h.reason}</b><br><small class="text-muted">${new Date(h.timestamp).toLocaleDateString('th-TH')}</small></div>
                    <div class="text-end">
                        <span class="fw-bold ${h.pointsChange > 0 ? 'text-success' : 'text-danger'}">${h.pointsChange}</span>
                        ${h.refCode ? '<br><small class="text-primary">ดู QR</small>' : ''}
                    </div>
                </div>
            `).join("")}
        </section>

        <section id="tab-profile" class="mobile-section">
            <div class="clean-card p-0 overflow-hidden">
                <div class="p-3 border-bottom" onclick="editEmail('${user.email}')"><i class="bi bi-envelope me-2"></i> แก้ไขอีเมล</div>
                <div class="p-3 text-danger fw-bold" onclick="localStorage.clear();location.reload();"><i class="bi bi-box-arrow-right me-2"></i> ออกจากระบบ</div>
            </div>
        </section>
    </div>

    <nav class="bottom-nav">
        <div class="nav-item active" onclick="switchTab('tab-home', this)"><i class="bi bi-house-door-fill"></i><br>หน้าแรก</div>
        <div class="nav-item" onclick="switchTab('tab-rewards', this)"><i class="bi bi-gift-fill"></i><br>คูปอง</div>
        <div class="nav-item" onclick="switchTab('tab-history', this)"><i class="bi bi-clock-history"></i><br>ประวัติ</div>
        <div class="nav-item" onclick="switchTab('tab-profile', this)"><i class="bi bi-person-fill"></i><br>โปรไฟล์</div>
    </nav>`;
}

// ==========================================
// 3. หน้าแอดมิน (กล้องสแกนจริง + แนบไฟล์ออโต้)
// ==========================================
function handleAdminPage() {
    const app = document.getElementById("app");
    app.innerHTML = `
    <style>body { background: #556677; color: #fff; font-family: 'Kanit', sans-serif; }</style>
    <div class="container py-4" style="max-width: 600px;">
        <h4 class="text-center fw-bold mb-4">Admin Management</h4>
        <div class="card p-4 shadow-lg border-0 mb-4" style="border-radius:24px; color:#333;">
            <div class="input-group mb-3">
                <button class="btn btn-primary" id="startScan"><i class="bi bi-qr-code-scan"></i> สแกน</button>
                <input type="text" id="adminSearch" class="form-control" placeholder="เบอร์โทร หรือ รหัส RWD-...">
                <button class="btn btn-dark" id="doSearch">ค้นหา</button>
            </div>
            <div id="adminRes" class="d-none p-3 bg-light rounded-3"></div>
        </div>
        
        <div class="card p-4 shadow-lg border-0" style="border-radius:24px; color:#333;">
            <h6 class="fw-bold mb-3">เพิ่มรางวัล (Cash Required)</h6>
            <input type="text" id="newRName" class="form-control mb-2" placeholder="ชื่อรางวัล">
            <input type="number" id="newRPoints" class="form-control mb-2" placeholder="พอยท์ที่ใช้">
            <input type="number" id="newRCash" class="form-control mb-3" placeholder="เงินที่ต้องเพิ่ม (ถ้ามี)" value="0">
            <button class="btn btn-success w-100 fw-bold" id="saveR">บันทึก</button>
        </div>
    </div>`;

    document.getElementById("startScan").onclick = () => {
        Swal.fire({
            title: 'สแกนคูปอง / ลูกค้า',
            html: `
                <div id="qr-reader" style="width:100%; border-radius:10px; overflow:hidden;"></div>
                <div class="mt-3">
                    <small>หรือเลือกรูปภาพคูปองจากเครื่อง</small>
                    <input type="file" id="file-qr" accept="image/*" class="form-control mt-1">
                </div>`,
            showCancelButton: true,
            didOpen: () => {
                const html5QrCode = new Html5Qrcode("qr-reader");
                const onScanSuccess = (decodedText) => {
                    html5QrCode.stop().then(() => {
                        document.getElementById("adminSearch").value = decodedText;
                        Swal.close();
                        document.getElementById("doSearch").click();
                    });
                };
                html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onScanSuccess);
                
                // ระบบแนบไฟล์แล้วสแกนอัตโนมัติ
                document.getElementById("file-qr").onchange = e => {
                    if (e.target.files[0]) {
                        html5QrCode.scanFile(e.target.files[0], true)
                        .then(onScanSuccess)
                        .catch(() => Swal.showValidationMessage("อ่านรูปภาพไม่ได้"));
                    }
                };
            }
        });
    };

    document.getElementById("doSearch").onclick = async () => {
        const val = document.getElementById("adminSearch").value;
        if (val.startsWith("RWD-")) {
            const ok = await Swal.fire({ title: 'ยืนยันการใช้คูปอง', text: val, showCancelButton: true });
            if (ok.isConfirmed) {
                await apiCall("useCoupon", { code: val });
                Swal.fire("สำเร็จ", "คูปองถูกใช้แล้ว", "success");
            }
        } else {
            const user = await apiCall("searchUser", { phone: val });
            const resArea = document.getElementById("adminRes");
            resArea.classList.remove("d-none");
            resArea.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div><b>${user.firstName}</b><br><small>${user.phone}</small></div>
                    <div class="h4 text-primary">${user.totalPoints}</div>
                </div>
                <div class="mt-3">
                    <input type="number" id="amt" class="form-control mb-2" placeholder="แต้ม +/-">
                    <button class="btn btn-success w-100 mb-2" id="savePt">บันทึกแต้ม</button>
                    <button class="btn btn-sm btn-outline-danger w-100" onclick="suspend('${user.phone}')">ระงับบัญชี</button>
                </div>`;
            
            document.getElementById("savePt").onclick = async () => {
                await apiCall("managePoints", { memberPhone: user.phone, pointsChange: document.getElementById("amt").value, reason: "โดย Admin" });
                Swal.fire("สำเร็จ", "ปรับแต้มแล้ว", "success");
                document.getElementById("doSearch").click();
            };
        }
    };
}

// --- ฟังก์ชันเสริม (Global) ---
window.switchTab = (id, el) => {
    document.querySelectorAll('.mobile-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    el.classList.add('active');
};

window.viewQr = (code, name, status) => {
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${code}`;
    Swal.fire({
        title: 'คูปองของคุณ',
        html: `<div class="p-3 bg-light rounded">
            <p class="mb-2"><b>${name}</b></p>
            <img src="${qr}" class="border p-2 bg-white mb-3" style="width:160px;">
            <div class="p-2 border border-dashed rounded fw-bold fs-4">${code}</div>
            <p class="mt-3 fw-bold ${status === 'used' ? 'text-success' : 'text-warning'}">${status === 'used' ? 'ใช้แล้ว' : 'รอใช้งาน'}</p>
        </div>`,
        confirmButtonText: 'ปิด'
    });
};

window.redeemGift = async (id, name) => {
    const ok = await Swal.fire({ title: 'แลกของรางวัล?', text: name, showCancelButton: true });
    if (ok.isConfirmed) {
        const res = await apiCall("redeemReward", { memberPhone: JSON.parse(localStorage.getItem("loggedInUser")).phone, rewardId: id });
        window.viewQr(res.refCode, name, 'pending');
    }
};
