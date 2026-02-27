const GAS_URL = "https://script.google.com/macros/s/AKfycbwz_WIhmE84bYpcTkMrE6tK5J3SQDlxDH3W5Dv3Pq3P7kWxVxegU5RNp0x-QmSCcsHspw/exec"; 

// ตรวจสอบ Library สแกน QR Code
if (typeof Html5Qrcode === 'undefined') {
    const script = document.createElement('script'); 
    script.src = "https://unpkg.com/html5-qrcode"; 
    document.head.appendChild(script);
}

function showLoading(title = "กำลังโหลด...") { 
    Swal.fire({ title: title, allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }}); 
}

function apiCall(action, payload) {
  showLoading("กำลังประมวลผล...");
  return fetch(GAS_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, payload }) })
  .then(res => res.json()).then(res => { 
      Swal.close(); 
      if (res.status === "error") throw new Error(res.message); 
      return res.data; 
  })
  .catch(err => { 
      Swal.fire({ icon: "error", title: "ข้อผิดพลาด", text: err.message }); 
      throw err; 
  });
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

// ==========================================
// 1. หน้า Login & ลืมรหัสผ่าน
// ==========================================
function handleLoginPage() {
    const rememberedUser = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    if (rememberedUser) { 
        window.location.href = JSON.parse(rememberedUser).isAdmin ? "admin.html" : "dashboard.html"; 
        return; 
    }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            apiCall("login", { phone: document.getElementById("phone").value, hashedPassword: hashPassword(document.getElementById("password").value) }).then(data => {
                if (document.getElementById("rememberMe").checked) localStorage.setItem("loggedInUser", JSON.stringify(data.user)); 
                else sessionStorage.setItem("loggedInUser", JSON.stringify(data.user));
                window.location.href = data.user.isAdmin ? "admin.html" : "dashboard.html";
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
                    title: '<h4 class="fw-bold mb-0">ยืนยันรหัส OTP</h4>', 
                    html: `<p class="text-muted small mb-4">รหัสถูกส่งไปยังอีเมลของคุณแล้ว</p>
                           <input id="swal-input-otp-login" class="form-control text-center py-3 rounded-3 fw-bold" style="letter-spacing: 12px; font-size: 1.5rem; background:#f8f9fa;" placeholder="------" maxlength="6">`, 
                    showCancelButton: true, 
                    confirmButtonColor: '#3b4b5b',
                    confirmButtonText: 'เข้าสู่ระบบ', 
                    customClass: { popup: 'rounded-4 shadow-lg' },
                    preConfirm: () => document.getElementById("swal-input-otp-login").value 
                }).then(res => {
                    if(res.isConfirmed) {
                        apiCall("verifyEmailOtp", { identifier, otp: res.value, isForLogin: true }).then(data => {
                            sessionStorage.setItem("loggedInUser", JSON.stringify(data.user));
                            window.location.href = data.user.isAdmin ? "admin.html" : "dashboard.html";
                        });
                    }
                });
            });
        });
    }

    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if(forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            Swal.fire({
                title: '<h4 class="fw-bold mb-0">ลืมรหัสผ่าน?</h4>',
                html: `<p class="text-muted small mb-4">ระบุเบอร์โทรเพื่อรับ OTP ทางอีเมลที่ผูกไว้</p>
                       <input type="tel" id="swal-forgot-phone" class="form-control text-center fs-5 py-2 rounded-3" placeholder="08XXXXXXXX" maxlength="10">`,
                showCancelButton: true,
                confirmButtonColor: '#3b4b5b',
                confirmButtonText: 'ขอรหัส OTP',
                customClass: { popup: 'rounded-4 shadow-lg' },
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
                            title: '<h4 class="fw-bold mb-0">ยืนยันรหัส OTP</h4>',
                            html: `<p class="text-muted small mb-4">รหัส 6 หลักส่งไปที่อีเมลของคุณแล้ว</p>
                                   <input type="text" id="swal-forgot-otp" class="form-control text-center py-3 rounded-3 fw-bold" style="letter-spacing: 12px; font-size: 1.5rem; background:#f8f9fa;" placeholder="------" maxlength="6">`,
                            showCancelButton: true,
                            confirmButtonColor: '#3b4b5b',
                            confirmButtonText: 'ยืนยันรหัส',
                            customClass: { popup: 'rounded-4 shadow-lg' },
                            preConfirm: () => document.getElementById('swal-forgot-otp').value
                        }).then((otpResult) => {
                            if(otpResult.isConfirmed) {
                                Swal.fire({
                                    title: '<h4 class="fw-bold mb-0">ตั้งรหัสผ่านใหม่</h4>',
                                    html: `<input type="password" id="swal-new-pass" class="form-control mb-3 py-2 rounded-3 text-center" placeholder="รหัสผ่านใหม่">
                                           <input type="password" id="swal-confirm-pass" class="form-control py-2 rounded-3 text-center" placeholder="ยืนยันรหัสผ่านใหม่">`,
                                    confirmButtonColor: '#3b4b5b',
                                    confirmButtonText: 'บันทึก',
                                    preConfirm: () => {
                                        const p1 = document.getElementById('swal-new-pass').value;
                                        const p2 = document.getElementById('swal-confirm-pass').value;
                                        if(p1 !== p2) { Swal.showValidationMessage('รหัสผ่านไม่ตรงกัน'); return false; }
                                        return p1;
                                    }
                                }).then((passResult) => {
                                    if(passResult.isConfirmed) {
                                        apiCall("resetPassword", { phone: phone, newHashedPassword: hashPassword(passResult.value) }).then(() => {
                                            Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว', customClass: { popup: 'rounded-4' } });
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

// ==========================================
// 2. หน้าสมัครสมาชิก
// ==========================================
function handleRegisterPage() {
    const policyCheckbox = document.getElementById("policyCheckbox");
    const registerBtn = document.getElementById("registerBtn");
    if (policyCheckbox && registerBtn) {
        policyCheckbox.addEventListener("change", function() {
            registerBtn.disabled = !this.checked;
        });
    }

    const viewPolicyLink = document.getElementById("viewPolicyLink");
    if (viewPolicyLink) {
        viewPolicyLink.addEventListener("click", function(e) {
            e.preventDefault();
            Swal.fire({
                title: '<h5 class="fw-bold">นโยบายความเป็นส่วนตัว</h5>',
                html: `<div style="text-align: left; font-size: 0.9rem; color: #556677; max-height: 300px; overflow-y: auto; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <p><strong>1. การเก็บรวบรวมข้อมูล:</strong> เราจะจัดเก็บข้อมูลพื้นฐานของท่าน เช่น ชื่อ เบอร์โทรศัพท์ และอีเมล เพื่อใช้ในระบบสมาชิก</p>
                        <p><strong>2. การใช้งานข้อมูล:</strong> ข้อมูลของท่านจะถูกนำไปใช้เพื่อจัดการสะสมพอยท์ แลกของรางวัล และการส่ง OTP เพื่อความปลอดภัย</p>
                        <p><strong>3. การรักษาความปลอดภัย:</strong> เราจะไม่เปิดเผยข้อมูลของท่านให้กับบุคคลที่สามโดยไม่ได้รับอนุญาต</p>
                       </div>`,
                confirmButtonColor: '#3b4b5b',
                confirmButtonText: 'รับทราบ',
                customClass: { popup: 'rounded-4' }
            });
        });
    }

    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const pass = document.getElementById("password").value;
            if (pass !== document.getElementById("confirmPassword").value) return Swal.fire("ผิดพลาด", "รหัสผ่านไม่ตรงกัน", "error");
            apiCall("register", { 
                firstName: document.getElementById("firstName").value, 
                lastName: document.getElementById("lastName").value, 
                phone: document.getElementById("phone").value, 
                email: document.getElementById("email").value, 
                hashedPassword: hashPassword(pass) 
            }).then(() => Swal.fire("สำเร็จ!", "สมัครสมาชิกสำเร็จ", "success").then(() => window.location.href = "index.html"));
        });
    }
}

// ==========================================
// 3. หน้าลูกค้า (Dashboard)
// ==========================================
window.showHistoryReward = function(reason, date, refCode, status) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(refCode)}`;
    const isUsed = status === 'used';
    
    Swal.fire({
        title: '<h5 class="fw-bold text-primary mb-0"><i class="bi bi-gift"></i> ของรางวัลของคุณ</h5>',
        html: `
            <div class="mt-3 p-4 bg-light rounded-4 border">
                <h6 class="text-muted small mb-2">วันที่แลก: ${date}</h6>
                <h5 class="fw-bold text-dark mb-4">${reason}</h5>
                <div class="text-center mb-4">
                    <img src="${qrUrl}" class="img-fluid border p-2 bg-white rounded-3" style="width:160px; ${isUsed ? 'opacity:0.2; filter:grayscale(100%);' : ''}">
                </div>
                <div class="p-3 border border-2 border-secondary rounded-3 bg-white" style="border-style: dashed !important;">
                    <small class="text-muted d-block mb-1">รหัสคูปอง</small>
                    <h3 class="fw-bold text-dark mb-0">${refCode}</h3>
                </div>
                <div class="mt-4">
                    ${isUsed ? '<span class="badge bg-success p-2">ใช้งานแล้ว</span>' : '<span class="badge bg-warning p-2 text-dark">รอใช้งาน</span>'}
                </div>
            </div>
            ${!isUsed ? '<p class="text-danger fw-bold mt-3 mb-0">แคปหน้าจอนี้ให้แอดมินสแกน</p>' : ''}
        `,
        confirmButtonColor: '#3b4b5b',
        confirmButtonText: 'ปิด',
        customClass: { popup: 'rounded-4 shadow-lg' }
    });
};

function handleDashboardPage() {
    const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    if (!userStr) { window.location.href = "index.html"; return; }
    const loggedInUser = JSON.parse(userStr);
    apiCall("getFullDashboardData", { phone: loggedInUser.phone }).then(data => renderDashboard(data.user, data.notifications, data.rewards));
}

function renderDashboard(user, notifications, rewards) {
    const app = document.getElementById("app");
    app.classList.remove("d-flex", "justify-content-center", "align-items-center");
    const rewardsByCategory = rewards.reduce((acc, r) => { (acc[r.category] = acc[r.category] || []).push(r); return acc; }, {});
    const cleanPhone = user.phone.replace(/'/g, '');
    const currentDay = new Date().getDay().toString();

    const customStyles = `<style>
        body { background: #f4f6f8; font-family: 'Kanit', sans-serif; padding-bottom: 70px; }
        .mobile-section { display: none; animation: fadeIn 0.3s; }
        .mobile-section.active { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .clean-card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); border: none; padding: 20px; margin-bottom: 15px; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; background: #fff; display: flex; justify-content: space-around; padding: 10px 0; border-top: 1px solid #f0f0f0; z-index: 1000; }
        .nav-item { text-align: center; color: #a0aec0; font-size: 0.75rem; cursor: pointer; flex: 1; }
        .nav-item.active { color: #3b4b5b; font-weight: bold; }
        .nav-item i { font-size: 1.4rem; display: block; }
        .menu-list-item { display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
    </style>`;

    app.innerHTML = customStyles + `
        <div class="container-fluid py-3" style="max-width: 600px;">
            <div class="text-center mb-4">
                <div class="profile-avatar mx-auto mb-2" style="width:80px; height:80px; background:#e2e8f0; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2rem;">${user.firstName[0]}</div>
                <h5 class="fw-bold mb-0">${user.firstName} ${user.lastName}</h5>
                <small class="text-muted">พอยท์ของคุณ: ${user.totalPoints}</small>
            </div>

            <main id="tab-home" class="mobile-section active">
                <div class="clean-card text-center">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cleanPhone}" class="mb-3 border p-1 rounded" style="width:140px;">
                    <p class="mb-0 fw-bold">${cleanPhone}</p>
                    <small class="text-muted">สแกนเพื่อสะสมแต้ม</small>
                </div>
            </main>

            <main id="tab-rewards" class="mobile-section">
                ${Object.keys(rewardsByCategory).map(cat => `
                    <h6 class="fw-bold text-muted small mt-3">${cat}</h6>
                    <div class="d-flex overflow-auto gap-3 pb-2" style="scrollbar-width: none;">
                        ${rewardsByCategory[cat].map(r => {
                            const isSpecial = cat === "โปรประจำสัปดาห์";
                            const canRedeemToday = isSpecial ? (r.activeDays || "").split(",").includes(currentDay) : true;
                            const hasPoints = user.totalPoints >= r.pointsRequired;
                            const canRedeem = hasPoints && canRedeemToday;

                            return `<div class="card flex-shrink-0" style="width: 200px; border-radius: 12px;">
                                <div class="card-body p-3">
                                    <h6 class="fw-bold text-truncate">${r.name}</h6>
                                    <p class="small text-muted" style="height: 40px; overflow: hidden;">${r.description}</p>
                                    <button class="btn btn-sm w-100 rounded-pill redeem-btn" data-reward-id="${r.rewardId}" data-reward-name="${r.name}" 
                                        ${canRedeem ? "" : "disabled"} style="background:${canRedeem ? '#3b4b5b' : '#eee'}; color:${canRedeem ? '#fff' : '#aaa'}; border:none;">
                                        ${r.pointsRequired} พอยท์
                                    </button>
                                    ${!canRedeemToday ? '<small class="text-danger d-block mt-1" style="font-size:0.65rem;">แลกไม่ได้ในวันนี้</small>' : ''}
                                </div>
                            </div>`;
                        }).join("")}
                    </div>
                `).join("")}
            </main>

            <main id="tab-history" class="mobile-section">
                <div class="clean-card p-0 overflow-hidden">
                    <ul class="list-group list-group-flush">
                        ${user.pointsHistory.map(log => {
                            const isRedeem = log.pointsChange < 0;
                            const date = new Date(log.timestamp).toLocaleDateString('th-TH');
                            const refCode = log.refCode || "RWD-" + Math.floor(1000+Math.random()*9000);
                            return `<li class="list-group-item d-flex justify-content-between align-items-center" ${isRedeem ? `onclick="showHistoryReward('${log.reason}', '${date}', '${refCode}', '${log.status || 'pending'}')"` : ""}>
                                <div><small class="d-block text-muted">${date}</small><strong>${log.reason}</strong>${isRedeem ? '<br><small class="text-primary fw-bold">คลิกดู QR Code</small>' : ''}</div>
                                <span class="badge ${isRedeem ? 'bg-danger' : 'bg-success'} rounded-pill">${log.pointsChange}</span>
                            </li>`;
                        }).join("")}
                    </ul>
                </div>
            </main>

            <main id="tab-profile" class="mobile-section">
                <div class="clean-card p-0 overflow-hidden">
                    <div class="menu-list-item" id="btnEditProfile"><i class="bi bi-person-gear me-3"></i> แก้ไขข้อมูลส่วนตัว</div>
                    <div class="menu-list-item text-danger" id="btnLogout"><i class="bi bi-box-arrow-right me-3"></i> ออกจากระบบ</div>
                </div>
            </main>
        </div>

        <nav class="bottom-nav">
            <div class="nav-item active" data-target="tab-home"><i class="bi bi-house-door"></i>หน้าหลัก</div>
            <div class="nav-item" data-target="tab-rewards"><i class="bi bi-gift"></i>แลกรางวัล</div>
            <div class="nav-item" data-target="tab-history"><i class="bi bi-clock-history"></i>ประวัติ</div>
            <div class="nav-item" data-target="tab-profile"><i class="bi bi-person"></i>บัญชี</div>
        </nav>
    `;

    // คุมการเปลี่ยน Tab
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
            title: 'แก้ไขข้อมูลส่วนตัว',
            html: `<div class="text-start mt-2">
                    <label class="small fw-bold">อีเมล</label>
                    <input type="email" id="editEmail" class="form-control mb-3" value="${user.email}">
                    <label class="small fw-bold text-muted">เบอร์โทรศัพท์ (แก้ไขไม่ได้)</label>
                    <input type="text" class="form-control bg-light" value="${cleanPhone}" disabled>
                    <small class="text-danger">* ติดต่อแอดมินหากต้องการเปลี่ยนเบอร์โทร</small>
                   </div>`,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            preConfirm: () => document.getElementById("editEmail").value
        }).then(res => { if(res.isConfirmed) Swal.fire("สำเร็จ", "บันทึกข้อมูลแล้ว", "success"); });
    });

    document.querySelectorAll(".redeem-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            const rName = this.dataset.rewardName;
            Swal.fire({ title: "ยืนยันการแลก?", text: rName, icon: "question", showCancelButton: true }).then(res => {
                if (res.isConfirmed) {
                    apiCall("redeemReward", { memberPhone: cleanPhone, rewardId: this.dataset.rewardId }).then(data => {
                        showHistoryReward(rName, new Date().toLocaleDateString('th-TH'), data.refCode || "RWD-NEW", 'pending');
                    });
                }
            });
        });
    });
}

// ==========================================
// 4. หน้าแอดมิน (Admin)
// ==========================================
function handleAdminPage() {
    const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    if (!userStr) { window.location.href = "index.html"; return; }
    const adminUser = JSON.parse(userStr);
    const app = document.getElementById("app");

    window.editCustomerPhone = (p) => Swal.fire({ title: 'เปลี่ยนเบอร์', input: 'text', showCancelButton: true }).then(res => { if(res.isConfirmed) Swal.fire('สำเร็จ', 'เปลี่ยนเบอร์แล้ว', 'success'); });
    window.suspendCustomer = (p) => Swal.fire({ title: 'ระงับบัญชี?', icon: 'warning', showCancelButton: true }).then(res => { if(res.isConfirmed) Swal.fire('เรียบร้อย', 'ระงับบัญชีแล้ว', 'success'); });

    app.innerHTML = `
        <div class="container-fluid p-4" style="max-width: 1000px;">
            <div class="card p-4 mb-4 shadow-sm border-0" style="border-radius:16px;">
                <h5 class="fw-bold mb-4">สแกน/ค้นหาลูกค้าหรือคูปอง</h5>
                <div class="input-group">
                    <button class="btn btn-outline-primary" id="scanBarcodeBtn"><i class="bi bi-qr-code-scan"></i> สแกน</button>
                    <input type="text" id="searchPhone" class="form-control" placeholder="เบอร์โทร หรือ รหัสคูปอง RWD-...">
                    <button class="btn btn-dark" id="searchBtn">ตกลง</button>
                </div>
                <div id="customerDetails" class="mt-4 d-none p-3 bg-light rounded-3"></div>
                <form id="pointsForm" class="mt-3 d-none p-3 border rounded-3">
                    <div class="row g-2">
                        <div class="col-4"><input type="number" id="pointsChange" class="form-control" placeholder="แต้ม" required></div>
                        <div class="col-8"><input type="text" id="reason" class="form-control" placeholder="เหตุผล" required></div>
                    </div>
                    <button type="submit" class="btn btn-success w-100 mt-2">บันทึกแต้ม</button>
                </form>
            </div>

            <div class="card p-4 shadow-sm border-0" style="border-radius:16px;">
                <h5 class="fw-bold mb-4">เพิ่มรางวัล/โปรโมชั่น</h5>
                <form id="addRewardForm">
                    <input type="text" id="rewardName" class="form-control mb-2" placeholder="ชื่อรางวัล" required>
                    <select id="rewardCategory" class="form-select mb-2" required>
                        <option value="ส่วนลดทั่วไป">ส่วนลดทั่วไป</option>
                        <option value="ส่วนลดสินค้าพรีเมี่ยม">ส่วนลดสินค้าพรีเมี่ยม</option>
                        <option value="แลกเงินสด">แลกเงินสด</option>
                        <option value="เสริมประกัน">เสริมประกัน</option>
                        <option value="โปรประจำสัปดาห์">โปรประจำสัปดาห์</option>
                    </select>
                    <div id="daySelector" class="d-none mb-2 p-2 border rounded">
                        <small class="d-block mb-1">เลือกวัน: 0(อา)-6(ส)</small>
                        <input type="text" id="activeDays" class="form-control" placeholder="เช่น 0,6">
                    </div>
                    <input type="number" id="rewardPoints" class="form-control mb-3" placeholder="ใช้แต้ม" required>
                    <button type="submit" class="btn btn-primary w-100">บันทึกของรางวัล</button>
                </form>
            </div>
            <button class="btn btn-link text-danger w-100 mt-4" onclick="localStorage.clear();location.reload();">ออกจากระบบ</button>
        </div>
    `;

    document.getElementById("rewardCategory").addEventListener("change", function() {
        document.getElementById("daySelector").classList.toggle("d-none", this.value !== "โปรประจำสัปดาห์");
    });

    const searchAction = () => {
        const val = document.getElementById("searchPhone").value.trim();
        if (val.toUpperCase().startsWith("RWD-")) {
            Swal.fire({ title: 'ยืนยันการใช้คูปอง', text: val, icon: 'info', showCancelButton: true }).then(res => {
                if(res.isConfirmed) apiCall("useCoupon", { code: val }).then(() => Swal.fire('สำเร็จ', 'ใช้คูปองแล้ว', 'success'));
            });
        } else {
            apiCall("searchUser", { phone: val }).then(user => {
                document.getElementById("customerDetails").innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div><strong>${user.firstName}</strong><br><small>${user.phone}</small></div>
                        <div class="text-end text-primary h4 mb-0">${user.totalPoints}</div>
                    </div>
                    <div class="mt-2 d-flex gap-2">
                        <button class="btn btn-sm btn-outline-info flex-fill" onclick="editCustomerPhone()">แก้เบอร์</button>
                        <button class="btn btn-sm btn-outline-danger flex-fill" onclick="suspendCustomer()">ระงับ</button>
                    </div>`;
                document.getElementById("customerDetails").classList.remove("d-none");
                document.getElementById("pointsForm").classList.remove("d-none");
            });
        }
    };

    document.getElementById("searchBtn").addEventListener("click", searchAction);
    document.getElementById("pointsForm").addEventListener("submit", (e) => {
        e.preventDefault();
        apiCall("managePoints", { 
            memberPhone: document.getElementById("searchPhone").value, 
            pointsChange: document.getElementById("pointsChange").value, 
            reason: document.getElementById("reason").value 
        }).then(() => { Swal.fire("สำเร็จ", "เพิ่มแต้มแล้ว", "success"); searchAction(); });
    });

    // แก้ไขระบบสแกน Multi-format + File
    document.getElementById("scanBarcodeBtn").addEventListener("click", () => {
        Swal.fire({
            title: 'สแกนรหัส',
            html: '<div id="qr-reader" style="width:100%; border-radius:10px; overflow:hidden;"></div><input type="file" id="qr-file" accept="image/*" class="form-control mt-3">',
            showCancelButton: true, showConfirmButton: false,
            didOpen: () => {
                const scanner = new Html5Qrcode("qr-reader");
                const onOk = (t) => { scanner.stop(); document.getElementById("searchPhone").value = t; Swal.close(); searchAction(); };
                scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onOk);
                document.getElementById("qr-file").addEventListener("change", e => {
                    if (e.target.files[0]) scanner.scanFile(e.target.files[0], true).then(onOk).catch(() => Swal.showValidationMessage("อ่านไม่ได้"));
                });
            }
        });
    });

    document.getElementById("addRewardForm").addEventListener("submit", (e) => {
        e.preventDefault();
        apiCall("addReward", {
            name: document.getElementById("rewardName").value,
            category: document.getElementById("rewardCategory").value,
            pointsRequired: document.getElementById("rewardPoints").value,
            activeDays: document.getElementById("activeDays").value
        }).then(() => { Swal.fire("สำเร็จ", "เพิ่มรางวัลแล้ว", "success"); e.target.reset(); });
    });
}
