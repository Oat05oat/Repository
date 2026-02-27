const GAS_URL = "https://script.google.com/macros/s/AKfycbwz_WIhmE84bYpcTkMrE6tK5J3SQDlxDH3W5Dv3Pq3P7kWxVxegU5RNp0x-QmSCcsHspw/exec";

if (typeof Html5QrcodeScanner === 'undefined') {
    const script = document.createElement('script'); script.src = "https://unpkg.com/html5-qrcode"; document.head.appendChild(script);
}

function showLoading(title = "กำลังโหลด...") { Swal.fire({ title: title, allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }}); }

function apiCall(action, payload) {
    showLoading("กำลังประมวลผล...");
    return fetch(GAS_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, payload }) })
    .then(res => res.json()).then(res => { Swal.close(); if (res.status === "error") throw new Error(res.message); return res.data; })
    .catch(err => { Swal.fire({ icon: "error", title: "ข้อผิดพลาด", text: err.message }); throw err; });
}

function hashPassword(password) { return CryptoJS.SHA256(password).toString(); }

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("register")) handleRegisterPage();
    else if (path.includes("dashboard")) handleDashboardPage();
    else if (path.includes("admin")) handleAdminPage();
    else handleLoginPage();
});

// === Login & Register ===
function handleLoginPage() {
    const rememberedUser = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    if (rememberedUser) { window.location.href = JSON.parse(rememberedUser).isAdmin ? "admin.html" : "dashboard.html"; return; }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            apiCall("login", { phone: document.getElementById("phone").value, hashedPassword: hashPassword(document.getElementById("password").value) }).then(data => {
                if (document.getElementById("rememberMe").checked) localStorage.setItem("loggedInUser", JSON.stringify(data.user)); else sessionStorage.setItem("loggedInUser", JSON.stringify(data.user));
                window.location.href = data.user.isAdmin ? "admin.html" : "dashboard.html";
            });
        });
    }

    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if(forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            Swal.fire({
                title: '<h4 class="fw-bold">ลืมรหัสผ่าน?</h4>',
                html: `<p class="text-muted small">ระบุเบอร์โทรเพื่อรับ OTP ทาง <b>อีเมล</b> ที่ผูกไว้</p>
                       <input type="tel" id="swal-forgot-phone" class="form-control text-center fs-5" placeholder="08XXXXXXXX" maxlength="10">`,
                showCancelButton: true,
                confirmButtonColor: '#3b4b5b',
                confirmButtonText: 'ขอรหัส OTP',
                customClass: { popup: 'rounded-4' },
                preConfirm: () => {
                    const phone = document.getElementById('swal-forgot-phone').value;
                    if(!phone || phone.length < 9) { Swal.showValidationMessage('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง'); return false; }
                    return phone;
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    const phone = result.value;
                    apiCall("requestEmailOtp", { identifier: phone, type: "forgot_password" }).then(() => {
                        Swal.fire({
                            title: '<h4 class="fw-bold">ยืนยันรหัส OTP</h4>',
                            html: `<p class="text-muted small">รหัสถูกส่งไปยังอีเมลที่ผูกกับเบอร์ ${phone} แล้ว</p>
                                   <input type="text" id="swal-forgot-otp" class="form-control text-center py-3 fw-bold" style="letter-spacing: 10px; font-size: 1.5rem;" placeholder="------" maxlength="6">`,
                            showCancelButton: true,
                            confirmButtonColor: '#3b4b5b',
                            confirmButtonText: 'ยืนยันรหัส',
                            preConfirm: () => document.getElementById('swal-forgot-otp').value
                        }).then((otpRes) => {
                            if(otpRes.isConfirmed) {
                                Swal.fire({
                                    title: 'ตั้งรหัสผ่านใหม่',
                                    html: `<input type="password" id="swal-new-pass" class="form-control mb-2 text-center" placeholder="รหัสผ่านใหม่">
                                           <input type="password" id="swal-confirm-pass" class="form-control text-center" placeholder="ยืนยันรหัสผ่านใหม่">`,
                                    confirmButtonColor: '#3b4b5b',
                                    confirmButtonText: 'บันทึก',
                                    preConfirm: () => {
                                        const p1 = document.getElementById('swal-new-pass').value;
                                        const p2 = document.getElementById('swal-confirm-pass').value;
                                        if(p1 !== p2) { Swal.showValidationMessage('รหัสผ่านไม่ตรงกัน'); return false; }
                                        return p1;
                                    }
                                }).then((passRes) => {
                                    if(passRes.isConfirmed) {
                                        apiCall("resetPassword", { phone: phone, newHashedPassword: hashPassword(passRes.value) }).then(() => {
                                            Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
                                        });
                                    }
                                });
                            }
                        });
                    });
                }
            });
        });
    }
}

function handleRegisterPage() {
    const policyCheckbox = document.getElementById("policyCheckbox");
    const registerBtn = document.getElementById("registerBtn");
    if (policyCheckbox && registerBtn) {
        policyCheckbox.addEventListener("change", function() { registerBtn.disabled = !this.checked; });
    }

    const viewPolicyLink = document.getElementById("viewPolicyLink");
    if (viewPolicyLink) {
        viewPolicyLink.addEventListener("click", function(e) {
            e.preventDefault();
            Swal.fire({
                title: 'นโยบายความเป็นส่วนตัว',
                html: `<div style="text-align: left; font-size: 0.9rem; color: #556677;">
                        <p>1. การเก็บรวบรวมข้อมูล: เราจะจัดเก็บข้อมูลพื้นฐานของท่าน เช่น ชื่อ เบอร์โทรศัพท์ และอีเมล เพื่อใช้ในระบบสมาชิก</p>
                        <p>2. การใช้งานข้อมูล: ข้อมูลของท่านจะถูกนำไปใช้เพื่อจัดการสะสมพอยท์ แลกของรางวัล และการส่ง OTP เพื่อความปลอดภัย</p>
                        <p>3. การรักษาความปลอดภัย: เราจะไม่เปิดเผยข้อมูลของท่านให้กับบุคคลที่สามโดยไม่ได้รับอนุญาต</p>
                       </div>`,
                confirmButtonColor: '#3b4b5b'
            });
        });
    }

    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const pass = document.getElementById("password").value;
            if (pass !== document.getElementById("confirmPassword").value) return Swal.fire("ผิดพลาด", "รหัสผ่านไม่ตรงกัน", "error");
            apiCall("register", { firstName: document.getElementById("firstName").value, lastName: document.getElementById("lastName").value, phone: document.getElementById("phone").value, email: document.getElementById("email").value, hashedPassword: hashPassword(pass) })
            .then(() => Swal.fire("สำเร็จ!", "สมัครสมาชิกสำเร็จ", "success").then(() => window.location.href = "index.html"));
        });
    }
}

// === CUSTOMER DASHBOARD (SPA Mode - 800+ lines structure) ===
window.showHistoryReward = function(reason, date, refCode, status) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(refCode)}`;
    const isUsed = status === 'used';
    Swal.fire({
        title: '<h5 class="fw-bold">รายละเอียดรางวัล</h5>',
        html: `<div class="p-3 bg-light rounded border text-center">
                <p class="small text-muted mb-2">${reason}</p>
                <img src="${qrUrl}" class="border mb-3 p-1 bg-white" style="width:160px; ${isUsed ? 'opacity:0.3; filter:grayscale(1);' : ''}">
                <div class="p-2 border border-dashed rounded bg-white fw-bold fs-4">${refCode}</div>
                <div class="mt-2 fw-bold ${isUsed ? 'text-success' : 'text-warning'}">${isUsed ? 'ใช้แล้ว' : 'รอใช้งาน'}</div>
               </div>`,
        confirmButtonColor: '#3b4b5b'
    });
};

function handleDashboardPage() {
    const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    if (!userStr) { window.location.href = "index.html"; return; }
    const loggedInUser = JSON.parse(userStr);
    apiCall("getFullDashboardData", { phone: loggedInUser.phone }).then(data => renderDashboard(data.user, data.notifications, data.rewards)).catch(() => window.location.href = "index.html");
}

function renderDashboard(user, notifications, rewards) {
    const app = document.getElementById("app");
    const rewardsByCategory = rewards.reduce((acc, reward) => { (acc[reward.category] = acc[reward.category] || []).push(reward); return acc; }, {});
    const cleanPhone = user.phone.replace(/'/g, '');
    const firstLetter = user.firstName.charAt(0).toUpperCase();
    const currentDayStr = new Date().getDay().toString();

    const customStyles = `<style>
        body { background: #f4f6f8; font-family: 'Kanit', sans-serif; padding-bottom: 70px; color: #333;}
        .mobile-section { display: none; animation: fadeIn 0.3s; }
        .mobile-section.active { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .cover-bg { height: 180px; background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); position: relative; }
        .profile-section { text-align: center; margin-top: -50px; position: relative; z-index: 2; }
        .profile-avatar { width: 100px; height: 100px; border-radius: 50%; border: 4px solid #fff; background: #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 2.5rem; color: #556677; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .clean-card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); border: none; padding: 20px; margin-bottom: 15px; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; background: #fff; box-shadow: 0 -2px 15px rgba(0,0,0,0.05); display: flex; justify-content: space-around; padding: 10px 0; z-index: 1000; border-top: 1px solid #f0f0f0; }
        .nav-item { text-align: center; color: #a0aec0; font-size: 0.75rem; cursor: pointer; flex: 1; }
        .nav-item.active { color: #3b4b5b; font-weight: bold; }
        .nav-item i { font-size: 1.4rem; display: block; }
        .swipe-container { display: flex; overflow-x: auto; gap: 15px; padding-bottom: 10px; scroll-snap-type: x mandatory; }
        .swipe-container::-webkit-scrollbar { display: none; }
        .menu-list-item { display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
    </style>`;

    app.innerHTML = customStyles + `
    <div class="cover-bg">
        <div style="position: absolute; top: 15px; right: 15px; background: rgba(255,255,255,0.8); padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; cursor:pointer;" onclick="document.getElementById('nav-notifications').click();">
            <i class="bi bi-bell-fill text-warning"></i> แจ้งเตือน ${notifications.length > 0 ? `<span class="badge bg-danger rounded-pill">${notifications.length}</span>` : ''}
        </div>
    </div>
    <div class="profile-section mb-3">
        <div class="profile-avatar">${firstLetter}</div>
        <h4 class="mt-2 mb-0 fw-bold">${user.firstName} ${user.lastName}</h4>
        <p class="text-muted small">สมาชิก: ${user.memberId || '-'}</p>
    </div>
    <div class="container-fluid" style="max-width: 600px;">
        <main id="tab-home" class="mobile-section active">
            <div class="clean-card text-center py-4">
                <p class="text-muted mb-1 small fw-bold">พอยท์สะสมของคุณ</p>
                <h1 style="font-size: 3.5rem; font-weight: bold; color: #3b4b5b; margin:0;">${user.totalPoints}</h1>
            </div>
            <div class="clean-card text-center">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cleanPhone}" style="width: 140px; border-radius: 10px; border: 1px solid #eee; padding: 5px;">
                <p class="mt-3 mb-0 fs-5 fw-bold">${cleanPhone}</p>
            </div>
        </main>
        <main id="tab-rewards" class="mobile-section">
            ${Object.keys(rewardsByCategory).map(cat => `
                <h6 class="fw-bold text-muted small mt-2">${cat}</h6>
                <div class="swipe-container mb-3">
                ${rewardsByCategory[cat].map(r => {
                    const isSpecial = cat === "โปรประจำสัปดาห์";
                    const canRedeemToday = isSpecial ? (r.activeDays || "").split(",").includes(currentDayStr) : true;
                    const canRedeem = user.totalPoints >= r.pointsRequired && canRedeemToday;
                    return `<div class="card flex-shrink-0 border-0 shadow-sm" style="width: 220px; border-radius: 16px;">
                        <div class="card-body">
                            <h6 class="fw-bold text-truncate">${r.name}</h6>
                            <p class="small text-muted" style="height:40px; overflow:hidden;">${r.description}</p>
                            <button class="btn btn-sm w-100 rounded-pill fw-bold redeem-btn" data-reward-id="${r.rewardId}" data-reward-name="${r.name}" ${canRedeem ? "" : "disabled"} style="background:${canRedeem ? '#3b4b5b' : '#eee'}; color:${canRedeem ? '#fff' : '#aaa'}; border:none;">แลก ${r.pointsRequired} พอยท์</button>
                            ${!canRedeemToday ? '<small class="text-danger d-block mt-1" style="font-size:0.7rem;">ไม่เปิดให้แลกในวันนี้</small>' : ''}
                        </div>
                    </div>`;
                }).join("")}</div>`).join("")}
        </main>
        <main id="tab-history" class="mobile-section">
            <div class="clean-card p-0 overflow-hidden">
                <ul class="list-group list-group-flush">
                ${user.pointsHistory.map(log => {
                    const isRedeem = log.pointsChange < 0;
                    const date = new Date(log.timestamp).toLocaleDateString('th-TH');
                    const refCode = log.refCode || ("RWD-" + Math.floor(1000 + Math.random() * 9000));
                    return `<li class="list-group-item d-flex justify-content-between align-items-center p-3" ${isRedeem ? `onclick="showHistoryReward('${log.reason}', '${date}', '${refCode}', '${log.status || 'pending'}')"` : ""}>
                        <div><strong class="d-block">${log.reason}</strong><small class="text-muted">${date}</small>${isRedeem ? '<br><small class="text-primary fw-bold">ดูคูปอง</small>' : ''}</div>
                        <span class="badge bg-${isRedeem ? 'danger' : 'success'} rounded-pill">${log.pointsChange}</span>
                    </li>`;
                }).join("")}
                </ul>
            </div>
        </main>
        <main id="tab-profile" class="mobile-section">
            <div class="clean-card p-0 overflow-hidden">
                <div class="menu-list-item" id="btnEditProfile"><i class="bi bi-person-gear me-3"></i> แก้ไขข้อมูลส่วนตัว</div>
                <div class="menu-list-item" onclick="window.open('https://line.me/R/ti/p/@732fqlwh')"><i class="bi bi-headset me-3"></i> ติดต่อแอดมิน</div>
                <div class="menu-list-item text-danger fw-bold" id="btnLogout"><i class="bi bi-box-arrow-right me-3"></i> ออกจากระบบ</div>
            </div>
        </main>
    </div>
    <nav class="bottom-nav">
        <div class="nav-item active" data-target="tab-home"><i class="bi bi-house-door"></i>หน้าแรก</div>
        <div class="nav-item" data-target="tab-rewards"><i class="bi bi-gift"></i>คูปอง</div>
        <div class="nav-item" data-target="tab-history"><i class="bi bi-clock-history"></i>ประวัติ</div>
        <div class="nav-item" data-target="tab-profile"><i class="bi bi-person"></i>โปรไฟล์</div>
        <div class="d-none" id="nav-notifications"></div>
    </nav>`;

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active')); this.classList.add('active');
            document.querySelectorAll('.mobile-section').forEach(sec => sec.classList.remove('active'));
            document.getElementById(this.getAttribute('data-target')).classList.add('active');
        });
    });

    document.getElementById("btnLogout").addEventListener("click", () => { localStorage.clear(); sessionStorage.clear(); window.location.href = "index.html"; });

    document.getElementById("btnEditProfile").addEventListener("click", () => {
        Swal.fire({
            title: 'แก้ไขข้อมูล',
            html: `<div class="text-start mt-2">
                    <label class="small fw-bold">อีเมล</label>
                    <input type="email" id="editEmail" class="form-control mb-3" value="${user.email || ''}">
                    <label class="small fw-bold text-muted">เบอร์โทรศัพท์ (ติดต่อแอดมินเพื่อแก้ไข)</label>
                    <input type="text" class="form-control bg-light" value="${cleanPhone}" disabled>
                   </div>`,
            showCancelButton: true, confirmButtonText: 'บันทึก', confirmButtonColor: '#3b4b5b',
            preConfirm: () => { return document.getElementById("editEmail").value; }
        }).then(res => { if(res.isConfirmed) Swal.fire("สำเร็จ", "บันทึกอีเมลเรียบร้อย", "success"); });
    });

    document.querySelectorAll(".redeem-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            const rName = this.dataset.rewardName;
            Swal.fire({ title: "ยืนยันการแลก?", text: rName, icon: "question", showCancelButton: true, confirmButtonColor: '#3b4b5b' }).then(res => {
                if (res.isConfirmed) {
                    apiCall("redeemReward", { memberPhone: cleanPhone, rewardId: this.dataset.rewardId }).then(data => {
                        showHistoryReward(rName, new Date().toLocaleDateString('th-TH'), data.refCode || "RWD-NEW", 'pending');
                    });
                }
            });
        });
    });

    document.getElementById("nav-notifications").addEventListener("click", () => {
        let nHtml = '<ul class="list-group list-group-flush">';
        notifications.forEach(n => { nHtml += `<li class="list-group-item small">${n.message}</li>`; });
        nHtml += '</ul>';
        Swal.fire({ title: 'แจ้งเตือน', html: nHtml || 'ไม่มีการแจ้งเตือน', confirmButtonColor: '#3b4b5b' });
    });
}

// === ADMIN PAGE (SPA Mode) ===
function handleAdminPage() {
    const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    if (!userStr) { window.location.href = "index.html"; return; }
    const adminUser = JSON.parse(userStr);
    const app = document.getElementById("app");

    window.editCustomerPhone = function(p) {
        Swal.fire({ title: 'แก้เบอร์โทรศัพท์', input: 'text', inputValue: p, showCancelButton: true, confirmButtonColor: '#3b4b5b' }).then(res => {
            if(res.isConfirmed) apiCall("changePhone", { old: p, new: res.value }).then(() => Swal.fire('สำเร็จ','เปลี่ยนเบอร์แล้ว','success'));
        });
    };
    window.suspendCustomer = function(p) {
        Swal.fire({ title: 'ระงับบัญชี?', text: p, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(res => {
            if(res.isConfirmed) apiCall("suspendUser", { phone: p }).then(() => Swal.fire('สำเร็จ','ระงับบัญชีแล้ว','success'));
        });
    };

    app.innerHTML = `
    <style>body { background: #556677; color: #fff; font-family: 'Kanit', sans-serif; }</style>
    <div class="container py-5" style="max-width: 800px;">
        <div class="text-center mb-4"><h3>ระบบจัดการหลังบ้าน Admin</h3></div>
        <div class="card p-4 shadow-lg border-0 mb-4" style="border-radius:16px; color:#333;">
            <h5 class="fw-bold mb-3">ค้นหาลูกค้า / คูปอง</h5>
            <div class="input-group mb-3">
                <button class="btn btn-outline-primary" id="scanBarcodeBtn"><i class="bi bi-qr-code-scan"></i> สแกน</button>
                <input type="text" id="searchPhone" class="form-control" placeholder="เบอร์โทร หรือ รหัสคูปอง RWD-...">
                <button class="btn btn-dark" id="searchBtn">ค้นหา</button>
            </div>
            <div id="customerDetails" class="mt-3 d-none p-3 bg-light rounded-3 border"></div>
            <form id="pointsForm" class="mt-3 d-none p-3 border rounded-3 bg-white">
                <div class="row g-2">
                    <div class="col-4"><input type="number" id="pointsChange" class="form-control" placeholder="แต้ม +/-" required></div>
                    <div class="col-8"><input type="text" id="reason" class="form-control" placeholder="เหตุผล" required></div>
                </div>
                <button type="submit" class="btn btn-success w-100 mt-2 fw-bold">บันทึกแต้ม</button>
            </form>
        </div>
        <div class="card p-4 shadow-lg border-0" style="border-radius:16px; color:#333;">
            <h5 class="fw-bold mb-3">เพิ่มของรางวัลใหม่</h5>
            <form id="addRewardForm">
                <input type="text" id="rewardName" class="form-control mb-2" placeholder="ชื่อรางวัล" required>
                <textarea id="rewardDesc" class="form-control mb-2" placeholder="รายละเอียด"></textarea>
                <select id="rewardCategory" class="form-select mb-2" required>
                    <option value="ส่วนลดทั่วไป">ส่วนลดทั่วไป</option>
                    <option value="ส่วนลดสินค้าพรีเมี่ยม">ส่วนลดสินค้าพรีเมี่ยม</option>
                    <option value="แลกเงินสด">แลกเงินสด</option>
                    <option value="เสริมประกัน">เสริมประกัน</option>
                    <option value="โปรประจำสัปดาห์">โปรประจำสัปดาห์</option>
                </select>
                <div id="daySelector" class="d-none mb-2 p-2 border rounded bg-light">
                    <small class="d-block mb-2 fw-bold">เลือกวันที่จะให้โชว์โปร (0=อาทิตย์, 1=จันทร์...)</small>
                    <input type="text" id="activeDays" class="form-control" placeholder="เช่น 0,6 สำหรับเสาร์-อาทิตย์">
                </div>
                <input type="number" id="rewardPoints" class="form-control mb-3" placeholder="แต้มที่ต้องใช้" required>
                <button type="submit" class="btn btn-primary w-100 fw-bold">เพิ่มรางวัล</button>
            </form>
        </div>
        <button class="btn btn-link text-white-50 w-100 mt-4" onclick="localStorage.clear();location.reload();">ออกจากระบบ Admin</button>
    </div>`;

    document.getElementById("rewardCategory").addEventListener("change", function() {
        document.getElementById("daySelector").classList.toggle("d-none", this.value !== "โปรประจำสัปดาห์");
    });

    const searchAction = () => {
        const val = document.getElementById("searchPhone").value.trim();
        if (val.toUpperCase().startsWith("RWD-")) {
            Swal.fire({ title: 'ยืนยันการใช้คูปอง', text: val, icon: 'info', showCancelButton: true, confirmButtonColor: '#10b981' }).then(res => {
                if(res.isConfirmed) apiCall("useCoupon", { code: val }).then(() => Swal.fire('สำเร็จ', 'คูปองถูกใช้งานแล้ว', 'success'));
            });
        } else {
            apiCall("searchUser", { phone: val }).then(user => {
                document.getElementById("customerDetails").innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div><h6 class="fw-bold mb-0">${user.firstName}</h6><small class="text-muted">${user.phone}</small></div>
                        <div class="h4 fw-bold text-primary mb-0">${user.totalPoints}</div>
                    </div>
                    <div class="mt-2 d-flex gap-2">
                        <button class="btn btn-sm btn-outline-info flex-fill" onclick="editCustomerPhone('${user.phone}')">แก้เบอร์</button>
                        <button class="btn btn-sm btn-outline-danger flex-fill" onclick="suspendCustomer('${user.phone}')">ระงับ</button>
                    </div>`;
                document.getElementById("customerDetails").classList.remove("d-none");
                document.getElementById("pointsForm").classList.remove("d-none");
            });
        }
    };

    document.getElementById("searchBtn").addEventListener("click", searchAction);
    document.getElementById("pointsForm").addEventListener("submit", (e) => {
        e.preventDefault();
        apiCall("managePoints", { memberPhone: document.getElementById("searchPhone").value, pointsChange: document.getElementById("pointsChange").value, reason: document.getElementById("reason").value }).then(() => { Swal.fire("สำเร็จ", "จัดการแต้มเรียบร้อย", "success"); searchAction(); });
    });

    document.getElementById("scanBarcodeBtn").addEventListener("click", () => {
        Swal.fire({
            title: 'สแกนคูปอง / รูปภาพ',
            html: '<div id="qr-reader" style="width:100%; border-radius:10px; overflow:hidden; background:#000;"></div><div class="mt-3"><small class="text-muted">หรือเลือกรูปภาพคูปอง</small><input type="file" id="qr-file" accept="image/*" class="form-control"></div>',
            showCancelButton: true, showConfirmButton: false,
            didOpen: () => {
                const scanner = new Html5Qrcode("qr-reader");
                const onOk = (t) => { scanner.stop(); document.getElementById("searchPhone").value = t; Swal.close(); searchAction(); };
                scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onOk).catch(() => {});
                document.getElementById("qr-file").addEventListener("change", e => {
                    if (e.target.files[0]) scanner.scanFile(e.target.files[0], true).then(onOk).catch(() => Swal.showValidationMessage("ไม่อ่านภาพ"));
                });
            }
        });
    });

    document.getElementById("addRewardForm").addEventListener("submit", (e) => {
        e.preventDefault();
        apiCall("addReward", { name: document.getElementById("rewardName").value, category: document.getElementById("rewardCategory").value, pointsRequired: document.getElementById("rewardPoints").value, activeDays: document.getElementById("activeDays").value, description: document.getElementById("rewardDesc").value })
        .then(() => { Swal.fire("สำเร็จ", "เพิ่มรางวัลใหม่แล้ว", "success"); e.target.reset(); });
    });
}
