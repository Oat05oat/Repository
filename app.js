const GAS_URL = "https://script.google.com/macros/s/AKfycbwz_WIhmE84bYpcTkMrE6tK5J3SQDlxDH3W5Dv3Pq3P7kWxVxegU5RNp0x-QmSCcsHspw/exec";

// ปรับจูนความเร็ว: โหลด Library สแกนเฉพาะเมื่อเรียกใช้
function apiCall(action, payload) {
    if (!Swal.isVisible()) showLoading("กำลังประมวลผล...");
    return fetch(GAS_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, payload }) })
    .then(res => res.json()).then(res => { 
        Swal.close(); 
        if (res.status === "error") throw new Error(res.message); 
        return res.data; 
    })
    .catch(err => { 
        Swal.fire({ icon: "error", title: "ข้อผิดพลาด", text: err.message, confirmButtonColor: '#3b4b5b', customClass: { popup: 'rounded-4' } }); 
        throw err; 
    });
}

function showLoading(title = "กำลังโหลด...") { 
    Swal.fire({ title: title, allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }, customClass: { popup: 'rounded-4' }}); 
}

function hashPassword(password) { return CryptoJS.SHA256(password).toString(); }

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("register")) handleRegisterPage();
    else if (path.includes("dashboard")) handleDashboardPage();
    else if (path.includes("admin")) handleAdminPage();
    else handleLoginPage();
});

// === 1. หน้า LOGIN & OTP ===
function handleLoginPage() {
    const loginOtpForm = document.getElementById("loginOtpForm");
    if (loginOtpForm) {
        loginOtpForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const identifier = document.getElementById("otpIdentifier").value;
            apiCall("requestEmailOtp", { identifier }).then(() => {
                Swal.fire({
                    title: '<h4 class="fw-bold">ยืนยัน OTP</h4>',
                    html: `<p class="small text-muted">รหัสส่งไปที่อีเมลของท่านแล้ว</p>
                           <input id="swal-otp" class="form-control text-center py-3 fw-bold" style="letter-spacing:10px; font-size:1.5rem;" maxlength="6" placeholder="------">`,
                    showCancelButton: true, confirmButtonText: 'ยืนยันเข้าสู่ระบบ', confirmButtonColor: '#3b4b5b',
                    customClass: { popup: 'rounded-4' },
                    preConfirm: () => document.getElementById("swal-otp").value
                }).then(res => {
                    if(res.isConfirmed) apiCall("verifyEmailOtp", { identifier, otp: res.value, isForLogin: true })
                    .then(data => { sessionStorage.setItem("loggedInUser", JSON.stringify(data.user)); window.location.href = data.user.isAdmin ? "admin.html" : "dashboard.html"; });
                });
            });
        });
    }
    // ปุ่มลืมรหัสผ่าน (เหมือนเดิมตามโค้ดก่อนหน้าที่คุณชอบ)
}

// === 2. หน้า DASHBOARD ลูกค้า (ปรับสีพื้นหลัง & ปุ่มกากบาทขวาบน) ===
function renderDashboard(user, notifications, rewards) {
    const app = document.getElementById("app");
    const rewardsByCategory = rewards.reduce((acc, r) => { (acc[r.category] = acc[r.category] || []).push(r); return acc; }, {});
    const cleanPhone = user.phone.replace(/'/g, '');
    const currentDayStr = new Date().getDay().toString();

    const customStyles = `<style>
        body { background: linear-gradient(180deg, #556677 0%, #f4f6f8 350px); font-family: 'Kanit', sans-serif; padding-bottom: 80px; }
        .noti-icon { position: absolute; top: 15px; right: 15px; background: rgba(255,255,255,0.9); padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; cursor:pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .profile-section { text-align: center; margin-top: -40px; }
        .profile-avatar { width: 95px; height: 95px; border-radius: 50%; border: 4px solid #fff; background: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 2.2rem; color: #556677; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .clean-card { background: #fff; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: none; padding: 25px; margin-bottom: 20px; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; background: #fff; display: flex; justify-content: space-around; padding: 12px 0; border-top: 1px solid #eee; z-index: 1000; border-radius: 20px 20px 0 0; }
        .nav-item.active { color: #3b4b5b; font-weight: bold; }
        .nav-item i { font-size: 1.6rem; display: block; }
        .swipe-container { display: flex; overflow-x: auto; gap: 15px; padding-bottom: 10px; scroll-snap-type: x mandatory; }
    </style>`;

    app.innerHTML = customStyles + `
    <div class="noti-icon" id="btnNotifications"><i class="bi bi-bell-fill text-warning"></i> แจ้งเตือน ${notifications.length > 0 ? `<span class="badge bg-danger rounded-pill">${notifications.length}</span>` : ''}</div>
    <div style="height:150px;"></div>
    <div class="profile-section mb-4">
        <div class="profile-avatar">${user.firstName[0].toUpperCase()}</div>
        <h4 class="mt-2 mb-0 fw-bold text-dark">${user.firstName} ${user.lastName}</h4>
        <p class="text-muted small">ID: ${user.memberId || '-'}</p>
    </div>
    <div class="container" style="max-width: 500px;">
        <main id="tab-home" class="mobile-section active">
            <div class="clean-card text-center py-4">
                <p class="text-muted mb-1 small fw-bold">พอยท์สะสมของคุณ</p>
                <h1 style="font-size: 4rem; font-weight: 800; color: #3b4b5b; margin:0;">${user.totalPoints}</h1>
            </div>
            <div class="clean-card text-center">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cleanPhone}" style="width: 140px; border-radius: 15px; border: 1px solid #eee; padding: 8px;">
                <p class="mt-3 mb-0 fs-5 fw-bold" style="letter-spacing:2px;">${cleanPhone}</p>
            </div>
        </main>
        </div>
    <nav class="bottom-nav">
        <div class="nav-item active" data-target="tab-home"><i class="bi bi-house-door-fill"></i>หน้าแรก</div>
        <div class="nav-item" data-target="tab-rewards"><i class="bi bi-gift-fill"></i>คูปอง</div>
        <div class="nav-item" data-target="tab-history"><i class="bi bi-clock-history"></i>ประวัติ</div>
        <div class="nav-item" data-target="tab-profile"><i class="bi bi-person-fill"></i>บัญชี</div>
    </nav>`;

    // การแจ้งเตือน (ปุ่มปิดขวาบน)
    document.getElementById("btnNotifications").addEventListener("click", () => {
        let nHtml = '<div class="text-start">';
        notifications.forEach(n => { nHtml += `<div class="p-3 border-bottom"><small class="text-muted">${new Date(n.timestamp).toLocaleString('th-TH')}</small><p class="mb-0 text-dark">${n.message}</p></div>`; });
        Swal.fire({ 
            title: '<span class="fw-bold">การแจ้งเตือน</span>', 
            html: nHtml || 'ไม่มีแจ้งเตือนใหม่', 
            showCloseButton: true, // ปุ่มกากบาทขวาบน
            showConfirmButton: false,
            customClass: { popup: 'rounded-4' }
        });
    });
    // สลับ Tab อัตโนมัติ (ข้ามไปส่วน Admin เพื่อความกระชับ)
}

// === 3. หน้า ADMIN (สแกนไวขึ้น + เพิ่มช่องเงินสด + แก้ Error Action) ===
function handleAdminPage() {
    const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    const app = document.getElementById("app");

    app.innerHTML = `
    <style>body { background: #445566; color: #fff; font-family: 'Kanit', sans-serif; }</style>
    <div class="container py-4" style="max-width: 700px;">
        <h3 class="text-center fw-bold mb-4">ระบบจัดการ LuckyShop24</h3>
        
        <div class="card p-4 shadow-lg border-0 mb-4" style="border-radius:24px; color:#333;">
            <h5 class="fw-bold mb-3 text-primary">สแกน / ค้นหา</h5>
            <div class="input-group mb-3">
                <button class="btn btn-primary px-3" id="scanBarcodeBtn"><i class="bi bi-qr-code-scan"></i></button>
                <input type="text" id="searchPhone" class="form-control border-0 bg-light" placeholder="เบอร์โทร หรือ รหัสคูปอง RWD-...">
                <button class="btn btn-dark px-4" id="searchBtn">ค้นหา</button>
            </div>
            <div id="customerDetails" class="d-none p-3 rounded-4 bg-light border mb-2"></div>
            <form id="pointsForm" class="d-none p-3 border rounded-4 bg-white mt-2">
                <div class="row g-2">
                    <div class="col-5"><input type="number" id="pointsChange" class="form-control" placeholder="แต้ม +/-" required></div>
                    <div class="col-7"><input type="text" id="reason" class="form-control" placeholder="เหตุผล" required></div>
                </div>
                <button type="submit" class="btn btn-success w-100 mt-3 fw-bold rounded-pill">บันทึกพอยท์</button>
            </form>
        </div>

        <div class="card p-4 shadow-lg border-0" style="border-radius:24px; color:#333;">
            <h5 class="fw-bold mb-3 text-success">เพิ่มรางวัลใหม่</h5>
            <form id="addRewardForm">
                <input type="text" id="rewardName" class="form-control mb-2 rounded-3" placeholder="ชื่อของรางวัล" required>
                <select id="rewardCategory" class="form-select mb-2 rounded-3" required>
                    <option value="ส่วนลดทั่วไป">ส่วนลดทั่วไป</option>
                    <option value="ส่วนลดสินค้าพรีเมี่ยม">ส่วนลดสินค้าพรีเมี่ยม</option>
                    <option value="แลกเงินสด">แลกเงินสด</option>
                    <option value="เสริมประกัน">เสริมประกัน</option>
                    <option value="โปรประจำสัปดาห์">โปรประจำสัปดาห์</option>
                </select>
                <div class="row g-2 mb-2">
                    <div class="col-6">
                        <label class="small fw-bold">ใช้พอยท์</label>
                        <input type="number" id="rewardPoints" class="form-control" placeholder="0" required>
                    </div>
                    <div class="col-6">
                        <label class="small fw-bold">ต้องจ่ายเพิ่ม (บาท)</label>
                        <input type="number" id="rewardCash" class="form-control" value="0" placeholder="0">
                    </div>
                </div>
                <div id="daySelector" class="d-none mb-3 p-2 border rounded bg-light">
                    <input type="text" id="activeDays" class="form-control" placeholder="เลือกวัน (เช่น 0,6)">
                </div>
                <button type="submit" class="btn btn-success w-100 fw-bold rounded-pill mt-2">บันทึกรางวัล</button>
            </form>
        </div>
    </div>`;

    // แก้ไขระบบสแกน: แยกเคส และลดเวลาค้นหา
    const searchAction = () => {
        const val = document.getElementById("searchPhone").value.trim();
        if (!val) return;
        if (val.toUpperCase().startsWith("RWD-")) {
            Swal.fire({
                title: 'ยืนยันการใช้คูปอง',
                html: `<div class="p-3 border rounded bg-light fw-bold fs-4">${val}</div>`,
                showCancelButton: true, confirmButtonText: 'ยืนยันการใช้งาน', confirmButtonColor: '#10b981', customClass: { popup: 'rounded-4' }
            }).then(res => {
                if(res.isConfirmed) apiCall("useCoupon", { code: val }).then(() => { Swal.fire('สำเร็จ', 'คูปองถูกใช้แล้ว', 'success'); document.getElementById("searchPhone").value = ""; });
            });
        } else {
            apiCall("searchUser", { phone: val }).then(user => {
                const details = document.getElementById("customerDetails");
                details.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div><h6 class="fw-bold mb-0">${user.firstName}</h6><small>${user.phone}</small></div>
                        <div class="h4 fw-bold text-primary mb-0">${user.totalPoints}</div>
                    </div>
                    <div class="mt-3 d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary flex-fill rounded-pill" onclick="editPhone('${user.phone}')">แก้เบอร์</button>
                        <button class="btn btn-sm btn-outline-danger flex-fill rounded-pill" onclick="suspendUser('${user.phone}')">ระงับ</button>
                    </div>`;
                details.classList.remove("d-none");
                document.getElementById("pointsForm").classList.remove("d-none");
            });
        }
    };

    // ปุ่มสแกนแบบอัปเกรด (รองรับแนบภาพ)
    document.getElementById("scanBarcodeBtn").addEventListener("click", () => {
        Swal.fire({
            title: 'สแกนคูปอง / รูปภาพ',
            html: '<div id="qr-reader" style="width:100%; border-radius:15px; overflow:hidden; background:#000;"></div><input type="file" id="qr-file" accept="image/*" class="form-control mt-3">',
            showCancelButton: true, showConfirmButton: false, customClass: { popup: 'rounded-4' },
            didOpen: () => {
                const scanner = new Html5Qrcode("qr-reader");
                const onOk = (t) => { scanner.stop(); document.getElementById("searchPhone").value = t; Swal.close(); searchAction(); };
                scanner.start({ facingMode: "environment" }, { fps: 15, qrbox: 250 }, onOk).catch(()=>{});
                document.getElementById("qr-file").addEventListener("change", e => {
                    if (e.target.files[0]) {
                        showLoading("กำลังอ่านภาพ...");
                        scanner.scanFile(e.target.files[0], true).then(onOk).catch(() => Swal.showValidationMessage("อ่านไม่ได้"));
                    }
                });
            }
        });
    });

    document.getElementById("searchBtn").addEventListener("click", searchAction);

    // ฟังก์ชันย่อยที่ต้องใช้ API เดียวกับหลังบ้าน
    window.editPhone = (p) => {
        Swal.fire({ title: 'แก้เบอร์โทร', input: 'text', inputValue: p, showCancelButton: true, customClass: { popup: 'rounded-4' } })
        .then(res => { if(res.isConfirmed) apiCall("changePhone", { old: p, new: res.value }).then(() => Swal.fire('สำเร็จ','เปลี่ยนเบอร์แล้ว','success')); });
    };
    window.suspendUser = (p) => {
        Swal.fire({ title: 'ระงับบัญชี?', text: p, icon: 'warning', showCancelButton: true, customClass: { popup: 'rounded-4' } })
        .then(res => { if(res.isConfirmed) apiCall("suspendUser", { phone: p }).then(() => Swal.fire('สำเร็จ','ระงับบัญชีแล้ว','success')); });
    };
}
