const GAS_URL = "https://script.google.com/macros/s/AKfycbwz_WIhmE84bYpcTkMrE6tK5J3SQDlxDH3W5Dv3Pq3P7kWxVxegU5RNp0x-QmSCcsHspw/exec";

// ปรับจูนความเร็ว: โหลด Library สแกนเฉพาะตอนจะใช้จริงๆ เท่านั้น
let html5QrCode = null;

function apiCall(action, payload) {
    if (!Swal.isVisible()) showLoading("กำลังประมวลผล...");
    return fetch(GAS_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, payload }) })
    .then(res => res.json()).then(res => { 
        Swal.close(); 
        if (res.status === "error") throw new Error(res.message); 
        return res.data; 
    })
    .catch(err => { 
        Swal.fire({ icon: "error", title: "ผิดพลาด", text: err.message, confirmButtonColor: '#3b4b5b' }); 
        throw err; 
    });
}

function showLoading(title = "กำลังโหลด...") { 
    Swal.fire({ title: title, allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }}); 
}

function hashPassword(password) { return CryptoJS.SHA256(password).toString(); }

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname.toLowerCase();
    const yearEl = document.getElementById('copyright-year') || document.getElementById('year');
    if(yearEl) yearEl.textContent = new Date().getFullYear();

    if (path.includes("register")) handleRegisterPage();
    else if (path.includes("dashboard")) handleDashboardPage();
    else if (path.includes("admin")) handleAdminPage();
    else handleLoginPage();
});

// === 1. ระบบ LOGIN (แก้บั๊กหมุนค้าง) ===
function handleLoginPage() {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const phone = document.getElementById("phone").value;
            const password = document.getElementById("password").value;
            apiCall("login", { phone: phone, hashedPassword: hashPassword(password) }).then(data => {
                const storage = document.getElementById("rememberMe").checked ? localStorage : sessionStorage;
                storage.setItem("loggedInUser", JSON.stringify(data.user));
                Swal.fire({ icon: 'success', title: 'ยินดีต้อนรับ', text: 'กำลังเข้าสู่ระบบ...', timer: 1500, showConfirmButton: false })
                .then(() => { window.location.href = data.user.isAdmin ? "admin.html" : "dashboard.html"; });
            });
        });
    }

    const loginOtpForm = document.getElementById("loginOtpForm");
    if (loginOtpForm) {
        loginOtpForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const identifier = document.getElementById("otpIdentifier").value;
            apiCall("requestEmailOtp", { identifier }).then(() => {
                Swal.fire({
                    title: 'ยืนยัน OTP',
                    html: `<input id="swal-otp" class="form-control text-center py-3 fw-bold" style="letter-spacing:10px; font-size:1.5rem;" maxlength="6">`,
                    showCancelButton: true, confirmButtonText: 'เข้าสู่ระบบ', confirmButtonColor: '#3b4b5b',
                    preConfirm: () => document.getElementById("swal-otp").value
                }).then(res => {
                    if(res.isConfirmed) apiCall("verifyEmailOtp", { identifier, otp: res.value, isForLogin: true })
                    .then(data => {
                        sessionStorage.setItem("loggedInUser", JSON.stringify(data.user));
                        window.location.href = data.user.isAdmin ? "admin.html" : "dashboard.html";
                    });
                });
            });
        });
    }
}

// === 2. หน้า DASHBOARD ลูกค้า (คืนค่า UI สวยงาม + แยกหมวดหมู่โปรประจำสัปดาห์) ===
function handleDashboardPage() {
    const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    if (!userStr) { window.location.href = "index.html"; return; }
    const loggedInUser = JSON.parse(userStr);
    apiCall("getFullDashboardData", { phone: loggedInUser.phone }).then(data => renderDashboard(data.user, data.notifications, data.rewards));
}

function renderDashboard(user, notifications, rewards) {
    const app = document.getElementById("app");
    const cleanPhone = user.phone.replace(/'/g, '');
    const currentDayStr = new Date().getDay().toString();

    // แยกรางวัลปกติ และ โปรประจำสัปดาห์
    const weeklyRewards = rewards.filter(r => r.category === "โปรประจำสัปดาห์");
    const otherRewards = rewards.filter(r => r.category !== "โปรประจำสัปดาห์");

    const customStyles = `<style>
        body { background: linear-gradient(180deg, #556677 0%, #f4f6f8 300px); font-family: 'Kanit', sans-serif; padding-bottom: 80px; }
        .noti-icon { position: absolute; top: 15px; right: 15px; background: #fff; padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; cursor:pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .profile-avatar { width: 90px; height: 90px; border-radius: 50%; border: 4px solid #fff; background: #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 2.2rem; color: #556677; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .clean-card { background: #fff; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); padding: 25px; margin-bottom: 20px; border:none; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; background: #fff; display: flex; justify-content: space-around; padding: 12px 0; border-top: 1px solid #eee; z-index: 1000; }
        .nav-item.active { color: #3b4b5b; font-weight: bold; }
        .nav-item i { font-size: 1.5rem; display: block; }
        .swipe-container { display: flex; overflow-x: auto; gap: 15px; padding-bottom: 5px; scroll-snap-type: x mandatory; }
        .reward-card { width: 220px; flex-shrink: 0; border-radius: 15px; border: none; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
    </style>`;

    app.innerHTML = customStyles + `
    <div class="noti-icon" id="btnNotifications"><i class="bi bi-bell-fill text-warning"></i> แจ้งเตือน ${notifications.length > 0 ? `<span class="badge bg-danger rounded-pill">${notifications.length}</span>` : ''}</div>
    <div style="height:140px;"></div>
    <div class="text-center mb-4">
        <div class="profile-avatar">${user.firstName[0]}</div>
        <h4 class="mt-2 mb-0 fw-bold">${user.firstName} ${user.lastName}</h4>
        <p class="text-muted small">ID: ${user.memberId || '-'}</p>
    </div>
    <div class="container" style="max-width: 500px;">
        <main id="tab-home" class="mobile-section active">
            <div class="clean-card text-center py-4">
                <p class="text-muted mb-1 small fw-bold">พอยท์สะสม</p>
                <h1 style="font-size: 3.5rem; font-weight: bold; color: #3b4b5b; margin:0;">${user.totalPoints}</h1>
            </div>
            <div class="clean-card text-center">
                <p class="fw-bold mb-3">สแกนเพื่อสะสมแต้ม</p>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cleanPhone}" style="width: 130px; border-radius: 12px; border: 1px solid #eee; padding: 5px;">
                <p class="mt-3 mb-0 fs-5 fw-bold" style="letter-spacing:2px;">${cleanPhone}</p>
            </div>
        </main>

        <main id="tab-rewards" class="mobile-section">
            <h5 class="fw-bold mb-3"><i class="bi bi-star-fill text-warning"></i> โปรประจำสัปดาห์</h5>
            <div class="swipe-container mb-4">
                ${weeklyRewards.length ? weeklyRewards.map(r => renderRewardItem(r, user.totalPoints, currentDayStr)).join("") : '<p class="text-muted small">ไม่มีโปรโมชั่นประจำวัน</p>'}
            </div>
            <h5 class="fw-bold mb-3"><i class="bi bi-gift-fill text-primary"></i> ของรางวัลอื่นๆ</h5>
            <div class="row g-3">
                ${otherRewards.map(r => `<div class="col-6">${renderRewardItem(r, user.totalPoints, currentDayStr, true)}</div>`).join("")}
            </div>
        </main>

        </div>
    <nav class="bottom-nav">
        <div class="nav-item active" data-target="tab-home"><i class="bi bi-house-door-fill"></i>หน้าแรก</div>
        <div class="nav-item" data-target="tab-rewards"><i class="bi bi-gift-fill"></i>คูปอง</div>
        <div class="nav-item" data-target="tab-history"><i class="bi bi-clock-history"></i>ประวัติ</div>
        <div class="nav-item" data-target="tab-profile"><i class="bi bi-person-fill"></i>โปรไฟล์</div>
    </nav>`;

    setupEventListeners(user, cleanPhone, notifications);
}

function renderRewardItem(r, userPoints, currentDay, isGrid = false) {
    const canRedeemToday = r.activeDays ? r.activeDays.split(",").includes(currentDay) : true;
    const canRedeem = userPoints >= r.pointsRequired && canRedeemToday;
    const cashText = r.cashRequired > 0 ? `<br><small class="text-danger">+ เงินสด ${r.cashRequired}฿</small>` : "";

    return `<div class="card ${isGrid ? 'w-100' : 'reward-card'} shadow-sm border-0 mb-2" style="border-radius:15px;">
        <div class="card-body p-3">
            <h6 class="fw-bold text-truncate mb-1">${r.name}</h6>
            <p class="small text-muted mb-2" style="height:35px; overflow:hidden;">${r.description}</p>
            <button class="btn btn-sm w-100 rounded-pill fw-bold redeem-btn" 
                data-reward-id="${r.rewardId}" data-reward-name="${r.name}"
                ${canRedeem ? "" : "disabled"} 
                style="background:${canRedeem ? '#3b4b5b' : '#f1f1f1'}; color:${canRedeem ? '#fff' : '#aaa'}; border:none;">
                ${r.pointsRequired} พอยท์ ${cashText}
            </button>
            ${!canRedeemToday ? '<small class="text-danger d-block mt-1 text-center" style="font-size:0.6rem;">ไม่เปิดให้แลกวันนี้</small>' : ''}
        </div>
    </div>`;
}

// === 3. หน้า ADMIN (แก้ไขปุ่มจัดการ & สแกนไวขึ้น) ===
function handleAdminPage() {
    const app = document.getElementById("app");
    app.innerHTML = `
    <style>body { background: #556677; color: #fff; font-family: 'Kanit', sans-serif; }</style>
    <div class="container py-4" style="max-width: 600px;">
        <h4 class="text-center fw-bold mb-4">Admin LuckyShop24</h4>
        <div class="card p-4 shadow-lg border-0 mb-4" style="border-radius:24px; color:#333;">
            <h6 class="fw-bold mb-3 text-primary">สแกน QR หรือ ค้นหาลูกค้า</h6>
            <div class="input-group mb-3">
                <button class="btn btn-primary" id="scanBarcodeBtn"><i class="bi bi-qr-code-scan"></i></button>
                <input type="text" id="searchPhone" class="form-control border-0 bg-light" placeholder="เบอร์โทร หรือ รหัสคูปอง RWD-...">
                <button class="btn btn-dark px-4" id="searchBtn">ค้นหา</button>
            </div>
            <div id="customerDetails" class="d-none p-3 rounded-4 bg-light border mb-2 text-center"></div>
            <form id="pointsForm" class="d-none p-3 border rounded-4 bg-white mt-2 shadow-sm">
                <div class="row g-2">
                    <div class="col-4"><input type="number" id="pointsChange" class="form-control" placeholder="แต้ม" required></div>
                    <div class="col-8"><input type="text" id="reason" class="form-control" placeholder="เหตุผล" required></div>
                </div>
                <button type="submit" class="btn btn-success w-100 mt-3 fw-bold rounded-pill">บันทึก</button>
            </form>
        </div>

        <div class="card p-4 shadow-lg border-0" style="border-radius:24px; color:#333;">
            <h6 class="fw-bold mb-3 text-success">เพิ่มของรางวัลใหม่</h6>
            <form id="addRewardForm">
                <input type="text" id="rewardName" class="form-control mb-2 rounded-3" placeholder="ชื่อรางวัล" required>
                <select id="rewardCategory" class="form-select mb-2 rounded-3" required>
                    <option value="ส่วนลดทั่วไป">ส่วนลดทั่วไป</option>
                    <option value="ส่วนลดสินค้าพรีเมี่ยม">ส่วนลดสินค้าพรีเมี่ยม</option>
                    <option value="แลกเงินสด">แลกเงินสด</option>
                    <option value="เสริมประกัน">เสริมประกัน</option>
                    <option value="โปรประจำสัปดาห์">โปรประจำสัปดาห์</option>
                </select>
                <div class="row g-2 mb-2">
                    <div class="col-6"><input type="number" id="rewardPoints" class="form-control" placeholder="ใช้พอยท์" required></div>
                    <div class="col-6"><input type="number" id="rewardCash" class="form-control" value="0" placeholder="เงินเพิ่ม (ถ้ามี)"></div>
                </div>
                <div id="daySelector" class="d-none mb-3 p-2 border rounded bg-light">
                    <small class="fw-bold">ระบุวัน (0-อาทิตย์, 1-จันทร์...) เช่น 0,6</small>
                    <input type="text" id="activeDays" class="form-control mt-1" placeholder="0,6">
                </div>
                <button type="submit" class="btn btn-primary w-100 fw-bold rounded-pill">เพิ่มรางวัล</button>
            </form>
        </div>
        <button class="btn btn-link text-white-50 w-100 mt-4" onclick="localStorage.clear();location.reload();">ออกจากระบบ</button>
    </div>`;

    setupAdminEvents();
}

function setupAdminEvents() {
    document.getElementById("rewardCategory").addEventListener("change", function() {
        document.getElementById("daySelector").classList.toggle("d-none", this.value !== "โปรประจำสัปดาห์");
    });

    const searchAction = () => {
        const val = document.getElementById("searchPhone").value.trim();
        if (!val) return;
        if (val.toUpperCase().startsWith("RWD-")) {
            Swal.fire({
                title: 'ยืนยันการใช้คูปอง?',
                html: `<h3 class="fw-bold">${val}</h3>`,
                showCancelButton: true, confirmButtonText: 'ยืนยันการใช้งาน', confirmButtonColor: '#10b981', customClass: { popup: 'rounded-4' }
            }).then(res => {
                if(res.isConfirmed) apiCall("useCoupon", { code: val }).then(() => { Swal.fire('สำเร็จ', 'คูปองถูกใช้แล้ว', 'success'); document.getElementById("searchPhone").value = ""; });
            });
        } else {
            apiCall("searchUser", { phone: val }).then(user => {
                const details = document.getElementById("customerDetails");
                details.innerHTML = `
                    <h5 class="fw-bold mb-1">${user.firstName}</h5>
                    <p class="text-primary fw-bold mb-3 h4">${user.totalPoints} พอยท์</p>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary flex-fill rounded-pill" onclick="adminAction('changePhone', '${user.phone}')">แก้เบอร์</button>
                        <button class="btn btn-sm btn-outline-danger flex-fill rounded-pill" onclick="adminAction('suspendUser', '${user.phone}')">ระงับบัญชี</button>
                    </div>`;
                details.classList.remove("d-none");
                document.getElementById("pointsForm").classList.remove("d-none");
            });
        }
    };

    document.getElementById("searchBtn").addEventListener("click", searchAction);

    // แก้ไขระบบสแกน (สแกนปุ๊บ ค้นหาปั๊บ)
    document.getElementById("scanBarcodeBtn").addEventListener("click", () => {
        Swal.fire({
            title: 'สแกนรหัส',
            html: '<div id="qr-reader" style="width:100%; border-radius:15px; overflow:hidden; background:#000;"></div><input type="file" id="qr-file" accept="image/*" class="form-control mt-3">',
            showCancelButton: true, showConfirmButton: false,
            didOpen: () => {
                const scanner = new Html5Qrcode("qr-reader");
                const onOk = (t) => { scanner.stop(); document.getElementById("searchPhone").value = t; Swal.close(); searchAction(); };
                scanner.start({ facingMode: "environment" }, { fps: 15, qrbox: 250 }, onOk).catch(()=>{});
                document.getElementById("qr-file").addEventListener("change", e => {
                    if (e.target.files[0]) scanner.scanFile(e.target.files[0], true).then(onOk).catch(() => Swal.fire('อ่านภาพไม่ได้','กรุณาใช้ภาพที่ชัดเจน','error'));
                });
            }
        });
    });
}

window.adminAction = function(action, phone) {
    if (action === 'changePhone') {
        Swal.fire({ title: 'แก้เบอร์โทร', input: 'text', inputValue: phone, showCancelButton: true }).then(res => {
            if(res.isConfirmed) apiCall("changePhone", { old: phone, new: res.value }).then(() => Swal.fire('สำเร็จ','เปลี่ยนเบอร์แล้ว','success'));
        });
    } else {
        Swal.fire({ title: 'ระงับบัญชี?', text: 'ลูกค้าจะไม่สามารถเข้าสู่ระบบได้', icon: 'warning', showCancelButton: true }).then(res => {
            if(res.isConfirmed) apiCall("suspendUser", { phone: phone }).then(() => Swal.fire('เรียบร้อย','ระงับบัญชีแล้ว','success'));
        });
    }
};
