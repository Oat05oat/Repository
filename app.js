// <<<<<<<<<<<< ใส่ URL ของ WEB APP จาก GOOGLE APPS SCRIPT ตรงนี้ >>>>>>>>>>>>>
const GAS_URL = "https://script.google.com/macros/s/AKfycbwz_WIhmE84bYpcTkMrE6tK5J3SQDlxDH3W5Dv3Pq3P7kWxVxegU5RNp0x-QmSCcsHspw/exec";
// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

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
  const yearSpan = document.getElementById("copyright-year"); if (yearSpan) yearSpan.textContent = new Date().getFullYear();
  if (path.includes("register")) handleRegisterPage();
  else if (path.includes("dashboard")) handleDashboardPage();
  else if (path.includes("admin")) handleAdminPage();
  else handleLoginPage();
});

// === Login & Register === (ตัดโค้ดยาวๆ ออกเพื่อให้คุณโฟกัสของใหม่ได้ แต่ฟังก์ชันเดิมทำงานครบ)
function handleLoginPage() {
    const rememberedUser = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    if (rememberedUser) { window.location.href = JSON.parse(rememberedUser).isAdmin ? "admin.html" : "dashboard.html"; return; }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            apiCall("login", { phone: document.getElementById("phone").value, hashedPassword: hashPassword(document.getElementById("password").value) }).then(data => {
                if (document.getElementById("rememberMe").checked) localStorage.setItem("loggedInUser", JSON.stringify(data.user)); else sessionStorage.setItem("loggedInUser", JSON.stringify(data.user));
                Swal.fire({ icon: "success", title: "เข้าสู่ระบบสำเร็จ", timer: 1500, showConfirmButton: false }).then(() => { window.location.href = data.user.isAdmin ? "admin.html" : "dashboard.html"; });
            });
        });
    }

    const loginOtpForm = document.getElementById("loginOtpForm");
    if (loginOtpForm) {
        loginOtpForm.addEventListener("submit", (e) => {
            e.preventDefault(); const identifier = document.getElementById("otpIdentifier").value;
            apiCall("requestEmailOtp", { identifier }).then(otpRes => {
                Swal.fire({ title: "ยืนยันรหัส OTP", html: `<p class="text-muted small mb-2">รหัสส่งไปที่อีเมลแล้ว</p><p class="small fw-bold text-info">Ref: ${otpRes.refno}</p><input id="swal-input-otp-login" class="form-control text-center fs-4 py-2" placeholder="รหัส 6 หลัก" maxlength="6">`, showCancelButton: true, confirmButtonText: "เข้าสู่ระบบ", preConfirm: () => document.getElementById("swal-input-otp-login").value })
                .then(res => {
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

    const forgotPasswordLink = document.getElementById("forgotPasswordLink");
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener("click", (e) => {
            e.preventDefault();
            Swal.fire({ title: "ลืมรหัสผ่าน", html: `<input id="swal-input-identifier" class="form-control" placeholder="เบอร์โทร หรือ อีเมล">`, showCancelButton: true, confirmButtonText: "ขอ OTP", preConfirm: () => document.getElementById("swal-input-identifier").value })
            .then(res => {
                if (res.isConfirmed) {
                    apiCall("requestEmailOtp", { identifier: res.value }).then(() => {
                        Swal.fire({ title: "ยืนยัน OTP", html: `<input id="swal-input-otp" class="form-control text-center fs-4" placeholder="6 หลัก">`, showCancelButton: true, confirmButtonText: "ยืนยัน", preConfirm: () => document.getElementById("swal-input-otp").value })
                        .then(otpRes => {
                            if (otpRes.isConfirmed) {
                                apiCall("verifyEmailOtp", { identifier: res.value, otp: otpRes.value }).then(() => {
                                    Swal.fire({ title: "ตั้งรหัสใหม่", html: `<input id="swal-new-pass" type="password" class="form-control">`, showCancelButton: true, confirmButtonText: "บันทึก", preConfirm: () => document.getElementById("swal-new-pass").value })
                                    .then(passRes => { if (passRes.isConfirmed) apiCall("updatePassword", { identifier: res.value, newHashedPassword: hashPassword(passRes.value) }).then(() => Swal.fire("สำเร็จ!", "เปลี่ยนรหัสผ่านแล้ว", "success")); });
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

// === Dashboard ===
function handleDashboardPage() {
  const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
  if (!userStr) { window.location.href = "index.html"; return; }
  const loggedInUser = JSON.parse(userStr);
  if (loggedInUser.isAdmin) { window.location.href = "admin.html"; return; }
  
  apiCall("getFullDashboardData", { phone: loggedInUser.phone }).then(data => renderDashboard(data.user, data.notifications, data.rewards)).catch(() => window.location.href = "index.html");
}

function renderDashboard(user, notifications, rewards) {
  const app = document.getElementById("app");
  const rewardsByCategory = rewards.reduce((acc, reward) => { (acc[reward.category] = acc[reward.category] || []).push(reward); return acc; }, {});
  
  // 🔥 บังคับแสดงหมวดหมู่ "โปรประจำสัปดาห์" แม้ไม่มีของ เพื่อให้แสดงคำว่า เร็วๆ นี้
  if (!rewardsByCategory["โปรประจำสัปดาห์"]) {
      rewardsByCategory["โปรประจำสัปดาห์"] = [{ isPlaceholder: true, name: "⏳ โปรเด็ด เร็วๆ นี้!", description: "รอติดตามโปรโมชั่นสุดคุ้มประจำวันได้ที่นี่ แวะมาเช็คบ่อยๆ นะคะ" }];
  } else if (rewardsByCategory["โปรประจำสัปดาห์"].length === 0) {
      rewardsByCategory["โปรประจำสัปดาห์"].push({ isPlaceholder: true, name: "⏳ โปรเด็ด เร็วๆ นี้!", description: "รอติดตามโปรโมชั่นสุดคุ้มประจำวันได้ที่นี่ แวะมาเช็คบ่อยๆ นะคะ" });
  }

  const cleanPhone = user.phone.replace(/'/g, ''); 
  let expiryMessageHtml = `<p class="mb-0 text-white-50 small"><i class="bi bi-info-circle me-1"></i> แต้มหมดอายุทุก 31 ธ.ค. ของปีถัดไป</p>`;
  if (user.expiringPoints > 0) expiryMessageHtml = `<div class="bg-white text-danger px-3 py-1 rounded-pill d-inline-block small fw-bold shadow-sm" style="animation: pulse 2s infinite;"><i class="bi bi-exclamation-triangle-fill me-1"></i> หมดอายุ ${user.expiringPoints} แต้ม ภายใน ${user.expiryDate}</div>`;

  const customStyles = `<style>body { background: linear-gradient(-45deg, #e0e7ff, #f8fafc, #ede9fe, #f1f5f9); background-size: 400% 400%; animation: gradientBG 15s ease infinite; } @keyframes gradientBG { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } } @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } } .swipe-container::-webkit-scrollbar { display: none; } .swipe-container { -ms-overflow-style: none; scrollbar-width: none; } .sidebar-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(3px); z-index: 1049; opacity: 0; visibility: hidden; transition: all 0.3s ease; } .sidebar-overlay.show { opacity: 1; visibility: visible; } .sidebar-menu { position: fixed; top: 0; left: -300px; width: 280px; height: 100vh; background: #ffffff; z-index: 1050; transition: left 0.3s; display: flex; flex-direction: column; overflow-y: auto; } .sidebar-menu.open { left: 0; } .menu-item { padding: 16px 24px; color: #475569; display: flex; align-items: center; gap: 15px; cursor: pointer; font-weight: 500; } .menu-item.active { background: #f8fafc; color: #4f46e5; } @media (max-width: 767.98px) { .mobile-section { display: none; } .mobile-section.active { display: block; } }</style>`;

  const memberCardHtml = `<div class="card border-0 shadow-lg mb-4 overflow-hidden" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; border-radius: 20px; min-height: 200px;"><div class="card-body p-4 d-flex justify-content-between align-items-center h-100"><div class="d-flex flex-column h-100" style="flex: 1;"><h5 class="fw-bold mb-1 text-truncate">${user.firstName} ${user.lastName}</h5><p class="mb-0 small" style="opacity: 0.85;">${cleanPhone}</p><div class="mt-4 mb-2"><p class="mb-0 small">แต้มสะสม</p><h1 class="display-3 fw-bold mb-0">${user.totalPoints}</h1></div><div>${expiryMessageHtml}</div></div><div class="bg-white p-2 rounded-4 shadow-sm text-center" style="width: 120px;"><img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${cleanPhone}" alt="QR" style="width: 100%; border-radius: 8px;"><span class="text-dark fw-bold mt-1" style="font-size: 0.65rem;">สแกนสะสมแต้ม</span></div></div></div>`;

  app.innerHTML = customStyles + `
        <div class="sidebar-overlay" id="sidebarOverlay"></div><div class="sidebar-menu" id="sidebarMenu"><div class="p-4 bg-light d-flex justify-content-between"><h6 class="mb-0 fw-bold">${user.firstName}</h6><button class="btn-close" id="closeSidebarBtn"></button></div><div class="py-2 d-flex flex-column flex-grow-1"><div class="menu-item active" data-target="tab-home">หน้าหลัก</div><div class="menu-item" data-target="tab-rewards">แลกรางวัล</div><div class="menu-item" data-target="tab-history">ประวัติ</div><div class="menu-item mt-auto text-danger" id="menuMobileLogout">ออกจากระบบ</div></div></div>
        <div class="container-fluid py-2" style="max-width: 1000px;">
            <header class="d-flex justify-content-between align-items-center mb-4 bg-white p-3 p-md-4 rounded-4 shadow-sm">
                <div class="d-flex align-items-center"><button id="burgerBtn" class="btn btn-light rounded-circle me-3 d-md-none"><i class="bi bi-list fs-4"></i></button><h3 class="fw-bold mb-0 text-dark fs-5 fs-md-3">สวัสดี, ${user.firstName} 🌟</h3></div>
                <div class="d-flex"><div id="notificationBellBtn" class="position-relative me-0 me-md-4" style="cursor: pointer;"><div class="bg-light rounded-circle d-flex align-items-center justify-content-center" style="width: 45px; height: 45px; color: #4f46e5;"><i class="bi bi-bell-fill"></i></div>${notifications.length > 0 ? `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">${notifications.length}</span>` : ""}</div><button id="logoutBtnDesktop" class="btn btn-outline-danger px-4 rounded-pill d-none d-md-block">ออกจากระบบ</button></div>
            </header>
            <main>
                <div id="tab-home" class="mobile-section active">${memberCardHtml}</div>
                <div class="row g-4"><div class="col-lg-7 col-xl-8"><div id="tab-rewards" class="mobile-section"><div class="card border-0 rounded-4 shadow-sm h-100 bg-white"><div class="card-header bg-transparent border-0 pt-4 px-4 pb-0"><h5 class="fw-bold mb-0"><i class="bi bi-gift-fill text-success me-2"></i>แลกของรางวัล</h5></div><div class="card-body p-0 pt-2 pb-4">
                    ${Object.keys(rewardsByCategory).map(category => `
                        <h6 class="text-primary fw-bold mb-3 mt-4 px-4">${category}</h6>
                        <div class="d-flex flex-nowrap overflow-x-auto gap-3 px-4 pb-3 swipe-container" style="scroll-snap-type: x mandatory;">
                        ${rewardsByCategory[category].map(reward => {
                            if(reward.isPlaceholder) return `<div class="card h-100 border rounded-4 shadow-sm flex-shrink-0 bg-light opacity-75" style="width: 250px;"><div class="card-body p-3 d-flex flex-column text-center justify-content-center"><i class="bi bi-hourglass-split display-4 text-muted mb-2"></i><h6 class="fw-bold text-dark">${reward.name}</h6><p class="small text-muted mb-0">${reward.description}</p></div></div>`;
                            const cashText = reward.cashRequired > 0 ? ` + ${reward.cashRequired}฿` : "";
                            return `<div class="card h-100 border rounded-4 shadow-sm flex-shrink-0" style="width: 250px;"><div class="card-body p-3 d-flex flex-column"><h6 class="fw-bold text-dark text-truncate">${reward.name}</h6><p class="small text-muted flex-grow-1">${reward.description}</p><button class="btn btn-sm w-100 rounded-pill fw-medium redeem-btn text-white" data-reward-id="${reward.rewardId}" data-reward-name="${reward.name}" ${user.totalPoints < reward.pointsRequired ? "disabled style='background:#e2e8f0;color:#94a3b8!important;'" : "style='background:#10b981;'"}><i class="bi bi-award-fill me-1"></i> แลก ${reward.pointsRequired} แต้ม${cashText}</button></div></div>`
                        }).join("")}</div>`).join("")}
                </div></div></div></div>
                <div class="col-lg-5 col-xl-4"><div id="tab-history" class="mobile-section"><div class="card border-0 rounded-4 shadow-sm bg-white"><div class="card-header bg-transparent border-0 pt-4 px-4 pb-0"><h5 class="fw-bold mb-0">ประวัติ</h5></div><div class="card-body p-0 mt-3"><ul class="list-group list-group-flush px-3 pb-3">${user.pointsHistory.length > 0 ? user.pointsHistory.map(log => `<li class="list-group-item d-flex justify-content-between px-2 py-3"><div><strong class="text-dark d-block text-truncate" style="max-width:180px;">${log.reason}</strong><small class="text-muted">${new Date(log.timestamp).toLocaleDateString()}</small></div><span class="badge bg-${log.pointsChange > 0 ? "success" : "danger"} bg-opacity-10 text-${log.pointsChange > 0 ? "success" : "danger"} rounded-pill d-flex align-items-center px-3">${log.pointsChange > 0 ? "+" : ""}${log.pointsChange}</span></li>`).join("") : '<div class="text-center p-4 text-muted">ไม่มีประวัติ</div>'}</ul></div></div></div></div></div>
            </main>
        </div>
    `;

  const doLogout = () => { localStorage.clear(); sessionStorage.clear(); window.location.href = "index.html"; };
  if(document.getElementById("logoutBtnDesktop")) document.getElementById("logoutBtnDesktop").addEventListener("click", doLogout);
  if(document.getElementById("menuMobileLogout")) document.getElementById("menuMobileLogout").addEventListener("click", doLogout);

  document.querySelectorAll('.menu-item[data-target]').forEach(btn => {
      btn.addEventListener('click', function() {
          document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active')); this.classList.add('active');
          document.querySelectorAll('.mobile-section').forEach(sec => sec.classList.remove('active'));
          document.getElementById(this.getAttribute('data-target')).classList.add('active');
          document.getElementById("sidebarMenu").classList.remove("open"); document.getElementById("sidebarOverlay").classList.remove("show"); window.scrollTo(0, 0);
      });
  });

  document.getElementById("burgerBtn").addEventListener("click", () => { document.getElementById("sidebarMenu").classList.add("open"); document.getElementById("sidebarOverlay").classList.add("show"); });
  document.getElementById("closeSidebarBtn").addEventListener("click", () => { document.getElementById("sidebarMenu").classList.remove("open"); document.getElementById("sidebarOverlay").classList.remove("show"); });
  
  document.getElementById("notificationBellBtn").addEventListener("click", () => {
    let nHtml = '<div class="text-start mt-2">';
    if (notifications.length === 0) nHtml += '<div class="text-center py-5"><p class="text-muted">ไม่มีแจ้งเตือน</p></div>'; 
    else {
        nHtml += '<ul class="list-group list-group-flush mb-4" style="max-height: 350px; overflow-y: auto;">';
        notifications.forEach((n) => { nHtml += `<li class="list-group-item px-1 py-3"><strong class="text-primary d-block mb-1 small">${new Date(n.timestamp).toLocaleDateString("th-TH")}</strong><span class="text-dark small">${n.message}</span></li>`; });
        nHtml += '</ul>';
    }
    Swal.fire({ title: '<h5 class="fw-bold text-start">การแจ้งเตือน</h5>', html: nHtml, showConfirmButton: false, showCloseButton: true });
  });

  document.querySelectorAll(".redeem-btn").forEach(btn => {
      btn.addEventListener("click", function() {
          Swal.fire({ title: "ยืนยันการแลกรางวัล?", text: `ต้องการแลก "${this.dataset.rewardName}" ใช่ไหม?`, showCancelButton: true, confirmButtonText: "ยืนยัน" }).then(res => {
              if (res.isConfirmed) apiCall("redeemReward", { memberPhone: cleanPhone, rewardId: this.dataset.rewardId }).then(() => Swal.fire("สำเร็จ", "แลกของรางวัลแล้ว", "success").then(() => location.reload()));
          });
      });
  });
}

// === หน้า Admin (เพิ่มระบบเลือกวันให้โปรโมชั่น) ===
function handleAdminPage() {
  const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
  if (!userStr) { window.location.href = "index.html"; return; }
  const adminUser = JSON.parse(userStr);
  if (!adminUser.isAdmin) { window.location.href = "index.html"; return; }
  
  const app = document.getElementById("app");
  app.innerHTML = `
        <div class="container-fluid py-4" style="max-width: 1200px;">
            <header class="d-flex justify-content-between align-items-center mb-4 bg-white p-4 rounded-4 shadow-sm">
                <div><h2 class="fw-bold mb-0">แอดมิน</h2><p class="text-muted mb-0">${adminUser.firstName}</p></div>
                <button id="logoutBtn" class="btn btn-outline-danger rounded-pill">ออกจากระบบ</button>
            </header>
            <div class="row g-4">
                <div class="col-lg-7">
                    <div class="card p-4 border-0 rounded-4 shadow-sm">
                        <h5 class="fw-bold mb-3"><i class="bi bi-qr-code-scan"></i> สแกนลูกค้า</h5>
                        <div class="input-group mb-4"><button class="btn btn-light border-0" id="scanBarcodeBtn"><i class="bi bi-qr-code-scan fs-5 px-2"></i></button><input type="text" id="searchPhone" class="form-control bg-light border-0" placeholder="เบอร์โทรศัพท์"><button class="btn btn-primary px-4" id="searchBtn">ค้นหา</button></div>
                        <div id="customerActions" class="d-none">
                            <div id="customerDetails" class="p-3 mb-3 rounded-4 bg-light"></div>
                            <form id="pointsForm" class="p-3 border rounded-4">
                                <h6 class="fw-bold">จัดการแต้ม</h6>
                                <input type="number" id="pointsChange" class="form-control mb-2" placeholder="แต้ม (+ เพิ่ม, - ลด)" required>
                                <input type="text" id="reason" class="form-control mb-2" placeholder="เหตุผล" required>
                                <input type="file" id="pointsImage" class="form-control mb-3" accept="image/*">
                                <button type="submit" class="btn btn-success w-100 rounded-pill">บันทึก</button>
                            </form>
                        </div>
                    </div>
                </div>
                <div class="col-lg-5">
                    <div class="card p-4 border-0 rounded-4 shadow-sm mb-4">
                        <h5 class="fw-bold mb-3">เพิ่มของรางวัล / โปรโมชั่น</h5>
                        <form id="addRewardForm">
                            <input type="text" id="rewardName" class="form-control mb-2" placeholder="ชื่อรางวัล" required>
                            <textarea id="rewardDesc" class="form-control mb-2" placeholder="รายละเอียด"></textarea>
                            <div class="row g-2 mb-2"><div class="col-6"><input type="number" id="rewardPoints" class="form-control" placeholder="ใช้แต้ม" required></div><div class="col-6"><input type="number" id="rewardCash" class="form-control" value="0" placeholder="ใช้เงิน"></div></div>
                            
                            <select id="rewardCategory" class="form-select mb-2" required>
                                <option value="ส่วนลด">ส่วนลด</option><option value="สินค้าพรีเมียม">สินค้าพรีเมียม</option>
                                <option value="โปรประจำสัปดาห์">โปรประจำสัปดาห์ (จำกัดวันแสดง)</option>
                            </select>

                            <div id="daySelectorContainer" class="mb-3 d-none p-3 bg-light rounded-3 border">
                                <label class="small fw-bold text-primary mb-2 d-block"><i class="bi bi-calendar-check me-1"></i>เลือกวันที่ให้โปรโมชั่นนี้แสดง</label>
                                <div class="d-flex flex-wrap gap-2">
                                    <div class="form-check"><input class="form-check-input promo-day" type="checkbox" value="1" id="d1"><label class="form-check-label small" for="d1">จ.</label></div>
                                    <div class="form-check"><input class="form-check-input promo-day" type="checkbox" value="2" id="d2"><label class="form-check-label small" for="d2">อ.</label></div>
                                    <div class="form-check"><input class="form-check-input promo-day" type="checkbox" value="3" id="d3"><label class="form-check-label small" for="d3">พ.</label></div>
                                    <div class="form-check"><input class="form-check-input promo-day" type="checkbox" value="4" id="d4"><label class="form-check-label small" for="d4">พฤ.</label></div>
                                    <div class="form-check"><input class="form-check-input promo-day" type="checkbox" value="5" id="d5"><label class="form-check-label small" for="d5">ศ.</label></div>
                                    <div class="form-check"><input class="form-check-input promo-day" type="checkbox" value="6" id="d6"><label class="form-check-label small text-danger" for="d6">ส.</label></div>
                                    <div class="form-check"><input class="form-check-input promo-day" type="checkbox" value="0" id="d0"><label class="form-check-label small text-danger" for="d0">อา.</label></div>
                                </div>
                                <small class="text-muted" style="font-size: 0.7rem;">*เมื่อถึงวันที่เลือก ระบบจะส่งแจ้งเตือนลูกค้าอัตโนมัติ</small>
                            </div>

                            <button type="submit" class="btn btn-warning w-100 rounded-pill fw-bold">เพิ่มเข้าระบบ</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;

  document.getElementById("logoutBtn").addEventListener("click", () => { localStorage.clear(); sessionStorage.clear(); window.location.href = "index.html"; });

  // แสดง/ซ่อนกล่องเลือกวัน เมื่อเลือกหมวดหมู่โปรประจำสัปดาห์
  document.getElementById("rewardCategory").addEventListener("change", function() {
      if (this.value === "โปรประจำสัปดาห์") document.getElementById("daySelectorContainer").classList.remove("d-none");
      else document.getElementById("daySelectorContainer").classList.add("d-none");
  });

  let currentCustomerPhone = null;
  const searchAction = () => {
    const phone = document.getElementById("searchPhone").value; if (!phone) return;
    apiCall("searchUser", { phone }).then((user) => {
        currentCustomerPhone = user.phone.replace(/'/g, '');
        document.getElementById("customerDetails").innerHTML = `<div class="d-flex justify-content-between"><div><h6 class="fw-bold mb-0">${user.firstName} ${user.lastName}</h6><small>${currentCustomerPhone}</small></div><h4 class="text-primary">${user.totalPoints}</h4></div>`;
        document.getElementById("customerActions").classList.remove("d-none");
      }).catch(() => Swal.fire("ไม่พบข้อมูล", "", "warning"));
  };
  document.getElementById("searchBtn").addEventListener("click", searchAction);

  document.getElementById("pointsForm").addEventListener("submit", (e) => {
    e.preventDefault(); const processPoints = (img64 = null, mime = null) => {
        apiCall("managePoints", { memberPhone: currentCustomerPhone, pointsChange: parseInt(document.getElementById("pointsChange").value, 10), reason: document.getElementById("reason").value, adminPhone: adminUser.phone, imageBase64: img64, imageMimeType: mime }).then(() => { Swal.fire("สำเร็จ", "", "success"); document.getElementById("pointsForm").reset(); searchAction(); });
    };
    const file = document.getElementById("pointsImage").files[0];
    if (file) { showLoading("อัปโหลด..."); const reader = new FileReader(); reader.onload = (e) => processPoints(e.target.result, file.type); reader.readAsDataURL(file); } else processPoints();
  });

  document.getElementById("addRewardForm").addEventListener("submit", (e) => {
    e.preventDefault();
    
    // ดึงค่าวันที่แอดมินติ๊กเลือก
    let selectedDays = [];
    if (document.getElementById("rewardCategory").value === "โปรประจำสัปดาห์") {
        document.querySelectorAll(".promo-day:checked").forEach(cb => selectedDays.push(cb.value));
        if(selectedDays.length === 0) return Swal.fire("แจ้งเตือน", "กรุณาเลือกวันอย่างน้อย 1 วัน สำหรับโปรประจำสัปดาห์", "warning");
    }

    const payload = {
      name: document.getElementById("rewardName").value, description: document.getElementById("rewardDesc").value, 
      pointsRequired: parseInt(document.getElementById("rewardPoints").value, 10), cashRequired: parseInt(document.getElementById("rewardCash").value, 10) || 0, 
      category: document.getElementById("rewardCategory").value, isNew: true, adminPhone: adminUser.phone,
      activeDays: selectedDays.join(",") // ส่งเป็น String เช่น "1,3,5"
    };
    apiCall("addReward", payload).then(() => { Swal.fire("สำเร็จ", "ระบบจะส่งแจ้งเตือนให้ลูกค้าอัตโนมัติ!", "success"); document.getElementById("addRewardForm").reset(); document.getElementById("daySelectorContainer").classList.add("d-none"); });
  });
}
