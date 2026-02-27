const GAS_URL = "https://script.google.com/macros/s/AKfycbwz_WIhmE84bYpcTkMrE6tK5J3SQDlxDH3W5Dv3Pq3P7kWxVxegU5RNp0x-QmSCcsHspw/exec";

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
    if (path.includes("register")) handleRegisterPage();
    else if (path.includes("dashboard")) handleDashboardPage();
    else if (path.includes("admin")) handleAdminPage();
    else handleLoginPage();
});

// ==========================================
// 1. หน้า LOGIN & ลืมรหัสผ่าน (UI เดิม)
// ==========================================
function handleLoginPage() {
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if(forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            Swal.fire({
                title: '<h4 class="fw-bold" style="color:#3b4b5b;">ลืมรหัสผ่าน?</h4>',
                html: `<p class="text-muted small">กรุณากรอกเบอร์โทรศัพท์ที่ลงทะเบียนไว้<br>ระบบจะส่ง OTP ไปยัง <b>อีเมล</b> ที่ผูกกับเบอร์นี้</p>
                       <input type="tel" id="swal-forgot-phone" class="form-control text-center fs-5 rounded-3" placeholder="08XXXXXXXX" maxlength="10">`,
                showCancelButton: true,
                confirmButtonColor: '#3b4b5b',
                confirmButtonText: 'ขอรหัส OTP',
                cancelButtonText: 'ยกเลิก',
                customClass: { popup: 'rounded-4 shadow-lg' },
                preConfirm: () => {
                    const phone = document.getElementById('swal-forgot-phone').value;
                    if(!phone || phone.length < 9) { Swal.showValidationMessage('เบอร์โทรศัพท์ไม่ถูกต้อง'); return false; }
                    return phone;
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    const phone = result.value;
                    apiCall("requestEmailOtp", { identifier: phone, type: "forgot_password" }).then(() => {
                        Swal.fire({
                            title: '<h4 class="fw-bold">ยืนยันรหัส OTP</h4>',
                            html: `<p class="text-muted small">รหัสส่งไปที่อีเมลที่ผูกกับเบอร์ ${phone} แล้ว</p>
                                   <input type="text" id="swal-forgot-otp" class="form-control text-center py-3 fw-bold rounded-3" style="letter-spacing: 12px; font-size: 1.5rem; background:#f8f9fa;" placeholder="------" maxlength="6">`,
                            showCancelButton: true,
                            confirmButtonColor: '#3b4b5b',
                            confirmButtonText: 'ยืนยันรหัส',
                            customClass: { popup: 'rounded-4 shadow-lg' },
                            preConfirm: () => document.getElementById('swal-forgot-otp').value
                        }).then((otpRes) => {
                            if(otpRes.isConfirmed) {
                                Swal.fire({
                                    title: 'ตั้งรหัสผ่านใหม่',
                                    html: `<input type="password" id="swal-new-pass" class="form-control mb-3 text-center" placeholder="รหัสผ่านใหม่">
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
                title: '<h5 class="fw-bold">นโยบายความเป็นส่วนตัว</h5>',
                html: `<div style="text-align: left; font-size: 0.9rem; color: #556677; background:#f8f9fa; padding:15px; border-radius:10px;">
                        <p><b>1. การเก็บรวบรวมข้อมูล:</b> เราจะจัดเก็บข้อมูลพื้นฐานของท่าน เช่น ชื่อ เบอร์โทรศัพท์ และอีเมล เพื่อใช้ในระบบสมาชิก</p>
                        <p><b>2. การใช้งานข้อมูล:</b> ข้อมูลของท่านจะถูกนำไปใช้เพื่อจัดการสะสมพอยท์ แลกของรางวัล และการส่ง OTP เพื่อความปลอดภัย</p>
                        <p><b>3. การรักษาความปลอดภัย:</b> เราจะไม่เปิดเผยข้อมูลของท่านให้กับบุคคลที่สามโดยไม่ได้รับอนุญาต</p>
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
            apiCall("register", { firstName: document.getElementById("firstName").value, lastName: document.getElementById("lastName").value, phone: document.getElementById("phone").value, email: document.getElementById("email").value, hashedPassword: hashPassword(pass) })
            .then(() => Swal.fire("สำเร็จ!", "สมัครสมาชิกสำเร็จ", "success").then(() => window.location.href = "index.html"));
        });
    }
}

// ==========================================
// 2. หน้าลูกค้า DASHBOARD (คืนโครงสร้างเดิม + พื้นหลังไล่สี + ไอคอนขวาบน)
// ==========================================
window.showHistoryReward = function(reason, date, refCode, status) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(refCode)}`;
    const isUsed = status === 'used';
    Swal.fire({
        title: '<h5 class="fw-bold text-primary mb-0"><i class="bi bi-gift"></i> รายละเอียดคูปอง</h5>',
        html: `
            <div class="mt-3 p-4 bg-light rounded-4 border">
                <h6 class="text-muted small mb-2">วันที่แลก: ${date}</h6>
                <h5 class="fw-bold text-dark mb-4">${reason}</h5>
                <div class="text-center mb-4">
                    <img src="${qrUrl}" class="img-fluid border p-2 bg-white rounded-3 shadow-sm" style="width:160px; height:160px; ${isUsed ? 'opacity:0.2; filter:grayscale(100%);' : ''}">
                </div>
                <div class="p-3 border border-2 border-secondary rounded-3 bg-white" style="border-style: dashed !important;">
                    <small class="text-muted d-block mb-1">รหัสคูปอง (สแกนหรือแจ้งแอดมิน)</small>
                    <h3 class="fw-bold text-dark mb-0 tracking-widest">${refCode}</h3>
                </div>
                <div class="mt-4 p-2 rounded-3 ${isUsed ? 'bg-success bg-opacity-10' : 'bg-warning bg-opacity-10'}">
                    <h4 class="fw-bold ${isUsed ? 'text-success' : 'text-warning'} mb-0">${isUsed ? 'ใช้งานแล้ว' : 'รอใช้งาน'}</h4>
                </div>
            </div>
            ${!isUsed ? '<p class="text-danger fw-bold mt-3 mb-0"><i class="bi bi-camera"></i> กรุณาแคปหน้าจอแจ้งแอดมิน</p>' : ''}`,
        confirmButtonColor: '#3b4b5b',
        confirmButtonText: 'ปิดหน้าต่าง',
        customClass: { popup: 'rounded-4 shadow-lg' }
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
    const rewardsByCategory = rewards.reduce((acc, r) => { (acc[r.category] = acc[r.category] || []).push(r); return acc; }, {});
    const cleanPhone = user.phone.replace(/'/g, '');
    const firstLetter = user.firstName.charAt(0).toUpperCase();
    const currentDayStr = new Date().getDay().toString();

    const customStyles = `
    <style>
        body { background: #f4f6f8; font-family: 'Kanit', sans-serif; padding-bottom: 70px; color: #333;}
        .mobile-section { display: none; animation: fadeIn 0.3s; }
        .mobile-section.active { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .cover-bg { height: 180px; background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); position: relative; }
        .noti-icon { position: absolute; top: 15px; right: 15px; background: rgba(255,255,255,0.8); padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; cursor:pointer; z-index: 10; }
        .profile-section { text-align: center; margin-top: -50px; position: relative; z-index: 2; }
        .profile-avatar { width: 100px; height: 100px; border-radius: 50%; border: 4px solid #fff; background: #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 2.5rem; color: #556677; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .clean-card { background: #fff; border-radius: 16px; box-shadow: 0 2px 15px rgba(0,0,0,0.05); border: none; padding: 25px; margin-bottom: 15px; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; background: #fff; box-shadow: 0 -2px 15px rgba(0,0,0,0.05); display: flex; justify-content: space-around; padding: 12px 0; z-index: 1000; border-top: 1px solid #f0f0f0; }
        .nav-item { text-align: center; color: #a0aec0; font-size: 0.75rem; cursor: pointer; flex: 1; transition: 0.2s; }
        .nav-item.active { color: #3b4b5b; font-weight: bold; }
        .nav-item i { font-size: 1.5rem; display: block; margin-bottom: 2px; }
        .swipe-container { display: flex; overflow-x: auto; gap: 15px; padding-bottom: 10px; scroll-snap-type: x mandatory; }
        .swipe-container::-webkit-scrollbar { display: none; }
        .menu-list-item { display: flex; align-items: center; padding: 18px; border-bottom: 1px solid #f8f8f8; cursor: pointer; color: #556677; }
        .menu-list-item i { width: 35px; font-size: 1.2rem; }
    </style>`;

    app.innerHTML = customStyles + `
    <div class="noti-icon" id="btnNotifications">
        <i class="bi bi-bell-fill text-warning"></i> แจ้งเตือน ${notifications.length > 0 ? `<span class="badge bg-danger rounded-pill">${notifications.length}</span>` : ''}
    </div>
    <div class="cover-bg"></div>
    <div class="profile-section mb-4">
        <div class="profile-avatar">${firstLetter}</div>
        <h4 class="mt-2 mb-0 fw-bold" style="color:#3b4b5b;">${user.firstName} ${user.lastName}</h4>
        <p class="text-muted small">รหัสสมาชิก: ${user.memberId || '-'}</p>
    </div>
    <div class="container-fluid" style="max-width: 600px; padding: 0 20px;">
        <main id="tab-home" class="mobile-section active">
            <div class="clean-card text-center py-4">
                <p class="text-muted mb-1 small fw-bold">พอยท์สะสมของคุณ</p>
                <h1 style="font-size: 3.5rem; font-weight: bold; color: #3b4b5b; margin:0;">${user.totalPoints}</h1>
            </div>
            <div class="clean-card text-center">
                <p class="fw-bold mb-3" style="color: #556677;">สแกนเพื่อสะสมแต้ม</p>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cleanPhone}" style="width: 140px; border-radius: 12px; border: 1px solid #eee; padding: 8px;">
                <p class="mt-3 mb-0 fs-5 fw-bold" style="letter-spacing:2px;">${cleanPhone}</p>
            </div>
        </main>
        <main id="tab-rewards" class="mobile-section">
            <h5 class="fw-bold mb-3" style="color:#3b4b5b;">ของรางวัลสำหรับคุณ</h5>
            ${Object.keys(rewardsByCategory).map(cat => `
                <h6 class="text-muted fw-bold small mt-3">${cat}</h6>
                <div class="swipe-container mb-3">
                ${rewardsByCategory[cat].map(r => {
                    const isSpecial = cat === "โปรประจำสัปดาห์";
                    const canRedeemToday = isSpecial ? (r.activeDays || "").split(",").includes(currentDayStr) : true;
                    const canRedeem = user.totalPoints >= r.pointsRequired && canRedeemToday;
                    return `<div class="card flex-shrink-0 border-0 shadow-sm" style="width: 220px; border-radius: 20px; scroll-snap-align: start;">
                        <div class="card-body">
                            <h6 class="fw-bold text-dark text-truncate">${r.name}</h6>
                            <p class="small text-muted" style="height:40px; overflow:hidden; font-size:0.8rem;">${r.description}</p>
                            <button class="btn btn-sm w-100 rounded-pill fw-bold redeem-btn" data-reward-id="${r.rewardId}" data-reward-name="${r.name}" ${canRedeem ? "" : "disabled"} style="background:${canRedeem ? '#3b4b5b' : '#f1f1f1'}; color:${canRedeem ? '#fff' : '#bbb'}; border:none; padding:8px;">ใช้ ${r.pointsRequired} พอยท์</button>
                            ${!canRedeemToday ? '<small class="text-danger d-block mt-2 text-center" style="font-size:0.7rem;"><i class="bi bi-calendar-x"></i> ไม่เปิดให้แลกวันนี้</small>' : ''}
                        </div>
                    </div>`;
                }).join("")}</div>`).join("")}
        </main>
        <main id="tab-history" class="mobile-section">
            <h5 class="fw-bold mb-3" style="color:#3b4b5b;">ประวัติการทำรายการ</h5>
            <div class="clean-card p-0 overflow-hidden">
                <ul class="list-group list-group-flush">
                ${user.pointsHistory.length > 0 ? user.pointsHistory.map(log => {
                    const isRedeem = log.pointsChange < 0;
                    const date = new Date(log.timestamp).toLocaleDateString('th-TH');
                    const refCode = log.refCode || ("RWD-" + Math.floor(1000 + Math.random() * 9000));
                    return `<li class="list-group-item d-flex justify-content-between align-items-center p-3 border-bottom" style="cursor:${isRedeem ? 'pointer':'default'}" ${isRedeem ? `onclick="showHistoryReward('${log.reason}', '${date}', '${refCode}', '${log.status || 'pending'}')"` : ""}>
                        <div><strong class="d-block text-dark" style="font-size:0.9rem;">${log.reason}</strong><small class="text-muted">${date}</small>${isRedeem ? '<br><span class="badge bg-primary mt-1" style="font-size:0.6rem;">คลิกดูคูปอง</span>' : ''}</div>
                        <span class="badge bg-${isRedeem ? 'danger' : 'success'} bg-opacity-10 text-${isRedeem ? 'danger' : 'success'} rounded-pill px-3 py-2 fs-6">${log.pointsChange > 0 ? '+':''}${log.pointsChange}</span>
                    </li>`;
                }).join("") : '<div class="p-4 text-center text-muted">ยังไม่มีรายการ</div>'}
                </ul>
            </div>
        </main>
        <main id="tab-profile" class="mobile-section">
            <h5 class="fw-bold mb-3" style="color:#3b4b5b;">ตั้งค่าบัญชี</h5>
            <div class="clean-card p-0 overflow-hidden">
                <div class="menu-list-item" id="btnEditProfile"><i class="bi bi-person-gear text-primary"></i> แก้ไขข้อมูลส่วนตัว</div>
                <div class="menu-list-item" onclick="window.open('https://line.me/R/ti/p/@732fqlwh')"><i class="bi bi-headset text-success"></i> ติดต่อแอดมิน (แจ้งเปลี่ยนเบอร์)</div>
                <div class="menu-list-item text-danger fw-bold" id="btnLogout"><i class="bi bi-box-arrow-right"></i> ออกจากระบบ</div>
            </div>
        </main>
    </div>
    <nav class="bottom-nav">
        <div class="nav-item active" data-target="tab-home"><i class="bi bi-house-door-fill"></i>หน้าแรก</div>
        <div class="nav-item" data-target="tab-rewards"><i class="bi bi-gift-fill"></i>คูปอง</div>
        <div class="nav-item" data-target="tab-history"><i class="bi bi-clock-history"></i>ประวัติ</div>
        <div class="nav-item" data-target="tab-profile"><i class="bi bi-person-fill"></i>โปรไฟล์</div>
    </nav>`;

    // สลับ Tab
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active')); this.classList.add('active');
            document.querySelectorAll('.mobile-section').forEach(sec => sec.classList.remove('active'));
            document.getElementById(this.getAttribute('data-target')).classList.add('active');
        });
    });

    document.getElementById("btnLogout").addEventListener("click", () => { localStorage.clear(); sessionStorage.clear(); window.location.href = "index.html"; });

    document.getElementById("btnNotifications").addEventListener("click", () => {
        let nHtml = '<div class="text-start">';
        notifications.forEach(n => { nHtml += `<div class="p-3 border-bottom"><small class="text-muted">${new Date(n.timestamp).toLocaleString('th-TH')}</small><p class="mb-0 text-dark">${n.message}</p></div>`; });
        nHtml += '</div>';
        Swal.fire({ title: 'การแจ้งเตือน', html: nHtml || 'ไม่มีแจ้งเตือนใหม่', confirmButtonColor: '#3b4b5b', customClass: { popup: 'rounded-4' } });
    });

    document.getElementById("btnEditProfile").addEventListener("click", () => {
        Swal.fire({
            title: 'แก้ไขข้อมูลส่วนตัว',
            html: `<div class="text-start mt-2">
                    <label class="small fw-bold">อีเมล</label>
                    <input type="email" id="editEmail" class="form-control mb-3 py-2" value="${user.email || ''}">
                    <label class="small fw-bold text-muted">เบอร์โทรศัพท์ (ไม่สามารถแก้ไขได้)</label>
                    <input type="text" class="form-control bg-light py-2" value="${cleanPhone}" disabled>
                    <small class="text-danger">* หากต้องการเปลี่ยนเบอร์โทร กรุณาติดต่อแอดมินผ่านไลน์</small>
                   </div>`,
            showCancelButton: true, confirmButtonText: 'บันทึก', confirmButtonColor: '#3b4b5b', cancelButtonText: 'ยกเลิก',
            preConfirm: () => document.getElementById("editEmail").value
        }).then(res => { if(res.isConfirmed) Swal.fire({icon: "success", title: "สำเร็จ", text: "บันทึกอีเมลเรียบร้อย", confirmButtonColor: '#3b4b5b'}); });
    });

    document.querySelectorAll(".redeem-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            const rName = this.dataset.rewardName;
            Swal.fire({ title: "ยืนยันการแลกรางวัล?", text: `ท่านต้องการแลก "${rName}" ใช่หรือไม่?`, icon: "question", showCancelButton: true, confirmButtonColor: '#3b4b5b' }).then(res => {
                if (res.isConfirmed) {
                    apiCall("redeemReward", { memberPhone: cleanPhone, rewardId: this.dataset.rewardId }).then(data => {
                        showHistoryReward(rName, new Date().toLocaleDateString('th-TH'), data.refCode || "RWD-SUCCESS", 'pending');
                    });
                }
            });
        });
    });
}

// ==========================================
// 3. หน้า ADMIN (UI สีเทาเข้ม + การ์ดขาว + สแกนภาพได้)
// ==========================================
function handleAdminPage() {
    const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    if (!userStr) { window.location.href = "index.html"; return; }
    const app = document.getElementById("app");

    window.editCustomerPhone = (p) => Swal.fire({ title: 'แก้เบอร์โทรศัพท์', input: 'text', inputValue: p, showCancelButton: true, confirmButtonColor: '#3b4b5b' }).then(res => {
        if(res.isConfirmed) apiCall("changePhone", { old: p, new: res.value }).then(() => Swal.fire('สำเร็จ','เปลี่ยนเบอร์แล้ว','success'));
    });
    window.suspendCustomer = (p) => Swal.fire({ title: 'ระงับบัญชี?', text: p, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(res => {
        if(res.isConfirmed) apiCall("suspendUser", { phone: p }).then(() => Swal.fire('เรียบร้อย','ระงับบัญชีแล้ว','success'));
    });

    app.innerHTML = `
    <style>body { background: #556677; color: #fff; font-family: 'Kanit', sans-serif; }</style>
    <div class="container py-5" style="max-width: 800px;">
        <div class="text-center mb-5"><h2 class="fw-bold">ระบบจัดการหลังบ้าน LuckyShop24</h2></div>
        
        <div class="card p-4 shadow-lg border-0 mb-4" style="border-radius:24px; color:#333;">
            <h5 class="fw-bold mb-4 text-primary"><i class="bi bi-search me-2"></i>สแกน / ค้นหาลูกค้าหรือคูปอง</h5>
            <div class="input-group mb-4 shadow-sm" style="border-radius:12px; overflow:hidden;">
                <button class="btn btn-primary px-4" id="scanBarcodeBtn"><i class="bi bi-qr-code-scan"></i> สแกน</button>
                <input type="text" id="searchPhone" class="form-control border-0 bg-light px-3" placeholder="เบอร์โทร หรือ รหัสคูปอง RWD-...">
                <button class="btn btn-dark px-4" id="searchBtn">ค้นหา</button>
            </div>
            <div id="customerDetails" class="d-none p-4 rounded-4 bg-light border-0 shadow-inner mb-3"></div>
            <form id="pointsForm" class="d-none p-4 rounded-4 border bg-white shadow-sm mt-3">
                <h6 class="fw-bold mb-3">จัดการคะแนน</h6>
                <div class="row g-2">
                    <div class="col-4"><input type="number" id="pointsChange" class="form-control rounded-3" placeholder="แต้ม +/-" required></div>
                    <div class="col-8"><input type="text" id="reason" class="form-control rounded-3" placeholder="เหตุผล (เช่น ยอดซื้อ 500 บาท)" required></div>
                </div>
                <button type="submit" class="btn btn-success w-100 mt-3 fw-bold rounded-pill shadow-sm py-2">บันทึกพอยท์</button>
            </form>
        </div>

        <div class="card p-4 shadow-lg border-0" style="border-radius:24px; color:#333;">
            <h5 class="fw-bold mb-4 text-success"><i class="bi bi-plus-circle me-2"></i>เพิ่มรางวัลหรือโปรโมชั่น</h5>
            <form id="addRewardForm">
                <div class="mb-3"><input type="text" id="rewardName" class="form-control rounded-3" placeholder="ชื่อของรางวัล" required></div>
                <div class="mb-3"><textarea id="rewardDesc" class="form-control rounded-3" placeholder="รายละเอียดของรางวัล" rows="2"></textarea></div>
                <div class="mb-3">
                    <label class="small fw-bold text-muted mb-1">หมวดหมู่รางวัล</label>
                    <select id="rewardCategory" class="form-select rounded-3" required>
                        <option value="ส่วนลดทั่วไป">ส่วนลดทั่วไป</option>
                        <option value="ส่วนลดสินค้าพรีเมี่ยม">ส่วนลดสินค้าพรีเมี่ยม</option>
                        <option value="แลกเงินสด">แลกเงินสด</option>
                        <option value="เสริมประกัน">เสริมประกัน</option>
                        <option value="โปรประจำสัปดาห์">โปรประจำสัปดาห์ (เลือกวันได้)</option>
                    </select>
                </div>
                <div id="daySelector" class="d-none mb-3 p-3 border rounded-4 bg-light">
                    <small class="d-block mb-2 fw-bold text-primary">เลือกวันที่จะให้โชว์โปรนี้ (0=อาทิตย์, 6=เสาร์)</small>
                    <input type="text" id="activeDays" class="form-control rounded-3" placeholder="เช่น 0,6 สำหรับเสาร์-อาทิตย์">
                </div>
                <div class="mb-4"><input type="number" id="rewardPoints" class="form-control rounded-3" placeholder="จำนวนพอยท์ที่ต้องใช้" required></div>
                <button type="submit" class="btn btn-success w-100 fw-bold rounded-pill py-2 shadow-sm">บันทึกของรางวัล</button>
            </form>
        </div>
        
        <div class="text-center mt-5">
            <button class="btn btn-link text-white-50 text-decoration-none" onclick="localStorage.clear();location.reload();">
                <i class="bi bi-box-arrow-left"></i> ออกจากระบบจัดการแอดมิน
            </button>
        </div>
    </div>`;

    document.getElementById("rewardCategory").addEventListener("change", function() {
        document.getElementById("daySelector").classList.toggle("d-none", this.value !== "โปรประจำสัปดาห์");
    });

    const searchAction = () => {
        const val = document.getElementById("searchPhone").value.trim();
        if (!val) return;
        
        if (val.toUpperCase().startsWith("RWD-")) {
            Swal.fire({
                title: '<h5 class="fw-bold text-primary">ยืนยันการใช้คูปอง</h5>',
                html: `<div class="p-4 bg-light rounded-4 my-2 border border-dashed"><h2 class="fw-bold mb-0">${val}</h2></div><p class="mt-3">ท่านยืนยันที่จะ "ใช้งาน" คูปองใบนี้ใช่หรือไม่?</p>`,
                showCancelButton: true, confirmButtonText: 'ยืนยันการใช้งาน', confirmButtonColor: '#10b981', cancelButtonText: 'ยกเลิก', customClass: { popup: 'rounded-4' }
            }).then(res => {
                if(res.isConfirmed) apiCall("useCoupon", { code: val }).then(() => { Swal.fire({icon:'success', title:'สำเร็จ!', text:'คูปองถูกใช้เรียบร้อยแล้ว', confirmButtonColor:'#3b4b5b'}); document.getElementById("searchPhone").value = ""; });
            });
        } else {
            apiCall("searchUser", { phone: val }).then(user => {
                document.getElementById("customerDetails").innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div><h5 class="fw-bold mb-1">${user.firstName} ${user.lastName}</h5><small class="text-muted"><i class="bi bi-telephone"></i> ${user.phone}</small></div>
                        <div class="text-end"><h3 class="text-primary fw-bold mb-0">${user.totalPoints}</h3><small class="text-muted">พอยท์</small></div>
                    </div>
                    <div class="mt-4 d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary flex-fill rounded-pill fw-bold" onclick="editCustomerPhone('${user.phone}')"><i class="bi bi-pencil-square"></i> แก้เบอร์โทร</button>
                        <button class="btn btn-sm btn-outline-danger flex-fill rounded-pill fw-bold" onclick="suspendCustomer('${user.phone}')"><i class="bi bi-person-x"></i> ระงับบัญชี</button>
                    </div>`;
                document.getElementById("customerDetails").classList.remove("d-none");
                document.getElementById("pointsForm").classList.remove("d-none");
            }).catch(() => { 
                document.getElementById("customerDetails").classList.add("d-none");
                document.getElementById("pointsForm").classList.add("d-none");
            });
        }
    };

    document.getElementById("searchBtn").addEventListener("click", searchAction);
    
    document.getElementById("pointsForm").addEventListener("submit", (e) => {
        e.preventDefault();
        apiCall("managePoints", { memberPhone: document.getElementById("searchPhone").value, pointsChange: document.getElementById("pointsChange").value, reason: document.getElementById("reason").value }).then(() => { 
            Swal.fire({icon: "success", title: "สำเร็จ", text: "จัดการพอยท์เรียบร้อย", confirmButtonColor: '#3b4b5b', customClass:{popup:'rounded-4'}}); 
            searchAction(); 
        });
    });

    // แก้ไขระบบสแกน Multi-format + แนบรูป
    document.getElementById("scanBarcodeBtn").addEventListener("click", () => {
        Swal.fire({
            title: '<h5 class="fw-bold">สแกนรหัสคูปอง / เบอร์โทร</h5>',
            html: `<div id="qr-reader" style="width:100%; border-radius:15px; overflow:hidden; background:#000;"></div>
                   <div class="mt-4 p-3 bg-light rounded-4">
                        <label class="small fw-bold d-block mb-2 text-muted text-start">หรือเลือกรูปภาพคูปองที่ลูกค้าส่งมา</label>
                        <input type="file" id="qr-file" accept="image/*" class="form-control rounded-3">
                   </div>`,
            showCancelButton: true, showConfirmButton: false, cancelButtonText: 'ปิดกล้อง', customClass:{popup:'rounded-4 shadow-lg'},
            didOpen: () => {
                const scanner = new Html5Qrcode("qr-reader");
                const onScanSuccess = (t) => { scanner.stop(); document.getElementById("searchPhone").value = t; Swal.close(); searchAction(); };
                scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onScanSuccess).catch(()=>{});
                
                document.getElementById("qr-file").addEventListener("change", e => {
                    if (e.target.files[0]) {
                        showLoading("กำลังวิเคราะห์รูปภาพ...");
                        scanner.scanFile(e.target.files[0], true).then(onScanSuccess)
                        .catch(() => Swal.fire({icon:'error', title:'อ่านรหัสไม่ได้', text:'กรุณาใช้ภาพคูปองที่ชัดเจนกว่านี้', confirmButtonColor:'#3b4b5b'}));
                    }
                });
            }
        });
    });

    document.getElementById("addRewardForm").addEventListener("submit", (e) => {
        e.preventDefault();
        apiCall("addReward", { name: document.getElementById("rewardName").value, description: document.getElementById("rewardDesc").value, category: document.getElementById("rewardCategory").value, activeDays: document.getElementById("activeDays").value, pointsRequired: document.getElementById("rewardPoints").value })
        .then(() => { Swal.fire({icon:"success", title:"สำเร็จ", text:"เพิ่มโปรโมชั่นเรียบร้อยแล้ว", confirmButtonColor:'#3b4b5b'}); e.target.reset(); });
    });
}
