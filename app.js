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

// === Login & Register Logic === (ทำงานเหมือนเดิม)
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

    const loginOtpForm = document.getElementById("loginOtpForm");
    if (loginOtpForm) {
        loginOtpForm.addEventListener("submit", (e) => {
            e.preventDefault(); const identifier = document.getElementById("otpIdentifier").value;
            apiCall("requestEmailOtp", { identifier }).then(otpRes => {
                Swal.fire({ title: "ยืนยันรหัส OTP", html: `<p class="text-muted small mb-2">รหัสส่งไปที่อีเมลแล้ว</p><input id="swal-input-otp-login" class="form-control text-center fs-4 py-2" placeholder="รหัส 6 หลัก" maxlength="6">`, showCancelButton: true, confirmButtonText: "เข้าสู่ระบบ", preConfirm: () => document.getElementById("swal-input-otp-login").value })
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
}

function handleRegisterPage() { /* ใช้ของเดิมได้เลย */ }

// ==========================================
// 🔥 CUSTOMER DASHBOARD (UX/UI ใหม่สไตล์แอป)
// ==========================================
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
  if (!rewardsByCategory["โปรประจำสัปดาห์"]) rewardsByCategory["โปรประจำสัปดาห์"] = [{ isPlaceholder: true, name: "⏳ เร็วๆ นี้", description: "รอติดตามโปรโมชั่นสุดคุ้มได้ที่นี่" }];
  
  const cleanPhone = user.phone.replace(/'/g, ''); 
  const firstLetter = user.firstName.charAt(0).toUpperCase();

  // 🔥 CSS สไตล์ใหม่ (มี Bottom Nav, Cover Image)
  const customStyles = `
    <style>
        body { background: #f4f6f8; font-family: 'Kanit', sans-serif; padding-bottom: 70px; color: #333;}
        .mobile-section { display: none; animation: fadeIn 0.3s; }
        .mobile-section.active { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        /* Header Cover & Profile */
        .cover-bg { height: 180px; background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); position: relative; }
        .profile-section { text-align: center; margin-top: -50px; position: relative; z-index: 2; }
        .profile-avatar { width: 100px; height: 100px; border-radius: 50%; border: 4px solid #fff; background: white; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.1); display: inline-flex; align-items: center; justify-content: center; font-size: 2.5rem; color: #556677; background: #e2e8f0; }
        
        /* Custom Cards */
        .clean-card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); border: none; padding: 20px; margin-bottom: 15px; }
        .point-box { text-align: center; padding: 15px 0; }
        .point-box h1 { font-size: 3rem; font-weight: bold; color: #3b4b5b; margin: 0; line-height: 1; }
        .qr-box img { width: 130px; height: 130px; display: block; margin: 0 auto; border-radius: 10px; border: 1px solid #eee; padding: 5px;}
        
        /* Bottom Navigation */
        .bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; background: #fff; box-shadow: 0 -2px 15px rgba(0,0,0,0.05); display: flex; justify-content: space-around; padding: 10px 0 5px 0; z-index: 1000; border-top: 1px solid #f0f0f0; }
        .nav-item { text-align: center; color: #a0aec0; font-size: 0.75rem; font-weight: 500; cursor: pointer; flex: 1; transition: 0.2s; }
        .nav-item i { font-size: 1.4rem; display: block; margin-bottom: 2px; transition: 0.2s;}
        .nav-item.active { color: #3b4b5b; }
        .nav-item.active i { transform: translateY(-3px); }
        
        /* Utility */
        .swipe-container { display: flex; flex-wrap: nowrap; overflow-x: auto; gap: 15px; padding-bottom: 10px; scroll-snap-type: x mandatory; }
        .swipe-container::-webkit-scrollbar { display: none; }
        .menu-list-item { display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #f0f0f0; cursor: pointer; color: #556677; }
        .menu-list-item:last-child { border-bottom: none; }
        .menu-list-item i { font-size: 1.2rem; width: 30px; color: #888; }
    </style>
  `;

  // HTML Structure
  app.innerHTML = customStyles + `
    <div class="cover-bg">
        <div style="position: absolute; top: 15px; right: 15px; background: rgba(255,255,255,0.8); padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; color: #333;" onclick="document.getElementById('nav-notifications').click();">
            <i class="bi bi-bell-fill text-warning"></i> แจ้งเตือน ${notifications.length > 0 ? `(${notifications.length})` : ''}
        </div>
    </div>

    <div class="profile-section mb-3">
        <div class="profile-avatar">${firstLetter}</div>
        <h4 class="mt-2 mb-0 fw-bold" style="color: #3b4b5b;">${user.firstName} ${user.lastName}</h4>
        <p class="text-muted small mb-0">รหัสสมาชิก: ${user.memberId}</p>
    </div>

    <div class="container-fluid" style="max-width: 600px; padding: 0 15px;">
        
        <main id="tab-home" class="mobile-section active">
            <div class="clean-card point-box">
                <p class="text-muted mb-1 small fw-bold">พอยท์สะสมของคุณ</p>
                <h1>${user.totalPoints}</h1>
                <p class="text-muted small mt-2 mb-0"><i class="bi bi-info-circle me-1"></i>${user.expiringPoints > 0 ? `<span class="text-danger fw-bold">จะหมดอายุ ${user.expiringPoints} แต้ม ภายใน ${user.expiryDate}</span>` : 'แต้มหมดอายุทุก 31 ธ.ค. ของปีถัดไป'}</p>
            </div>

            <div class="clean-card qr-box text-center">
                <p class="fw-bold mb-3" style="color: #556677;">สแกนเพื่อสะสม/แลกพอยท์</p>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cleanPhone}" alt="QR Code">
                <p class="text-muted mt-3 mb-0 fs-5 letter-spacing-2 fw-bold">${cleanPhone}</p>
            </div>
        </main>

        <main id="tab-rewards" class="mobile-section">
            <h5 class="fw-bold mb-3" style="color: #3b4b5b;">คูปอง / ของรางวัล</h5>
            ${Object.keys(rewardsByCategory).map(category => `
                <h6 class="text-muted fw-bold mb-2 small">${category}</h6>
                <div class="swipe-container mb-4">
                ${rewardsByCategory[category].map(reward => {
                    if(reward.isPlaceholder) return `<div class="card border border-dashed rounded-4 flex-shrink-0 bg-light" style="width: 220px; scroll-snap-align: center;"><div class="card-body text-center py-4"><i class="bi bi-hourglass-split display-4 text-muted mb-2"></i><h6 class="fw-bold text-dark">${reward.name}</h6><small class="text-muted">${reward.description}</small></div></div>`;
                    const cashText = reward.cashRequired > 0 ? ` + ${reward.cashRequired}฿` : "";
                    return `<div class="card border-0 rounded-4 shadow-sm flex-shrink-0" style="width: 240px; scroll-snap-align: center;"><div class="card-body d-flex flex-column"><h6 class="fw-bold text-dark text-truncate">${reward.name}</h6><p class="small text-muted flex-grow-1" style="font-size:0.8rem; line-height:1.4;">${reward.description}</p><button class="btn btn-sm w-100 rounded-pill fw-bold redeem-btn" data-reward-id="${reward.rewardId}" data-reward-name="${reward.name}" ${user.totalPoints < reward.pointsRequired ? "disabled style='background:#f1f5f9; color:#94a3b8; border:none;'" : "style='background:#3b4b5b; color:white; border:none;'"}>แลก ${reward.pointsRequired} พอยท์${cashText}</button></div></div>`
                }).join("")}</div>`).join("")}
        </main>

        <main id="tab-history" class="mobile-section">
            <h5 class="fw-bold mb-3" style="color: #3b4b5b;">ประวัติการทำรายการ</h5>
            <div class="clean-card p-0 overflow-hidden">
                <ul class="list-group list-group-flush">
                ${user.pointsHistory.length > 0 ? user.pointsHistory.map(log => `
                    <li class="list-group-item d-flex justify-content-between align-items-center p-3 border-bottom">
                        <div>
                            <strong class="text-dark d-block text-truncate" style="max-width:200px; font-size:0.9rem;">${log.reason}</strong>
                            <small class="text-muted" style="font-size:0.75rem;">${new Date(log.timestamp).toLocaleDateString('th-TH')} ${new Date(log.timestamp).toLocaleTimeString('th-TH',{hour:'2-digit', minute:'2-digit'})}</small>
                        </div>
                        <span class="badge bg-${log.pointsChange > 0 ? "success" : "danger"} bg-opacity-10 text-${log.pointsChange > 0 ? "success" : "danger"} rounded-pill px-3 py-2 fs-6">+${log.pointsChange}</span>
                    </li>`).join("") : '<li class="list-group-item text-center p-4 text-muted">ยังไม่มีประวัติการใช้งาน</li>'}
                </ul>
            </div>
        </main>

        <main id="tab-profile" class="mobile-section">
            <h5 class="fw-bold mb-3" style="color: #3b4b5b;">บัญชีของฉัน</h5>
            <div class="clean-card p-0 mb-4 overflow-hidden">
                <div class="menu-list-item" id="btnEditEmail"><i class="bi bi-envelope"></i> <div>อีเมลติดต่อ<br><small class="text-muted">${user.email || 'ยังไม่ได้ระบุ'}</small></div></div>
                <div class="menu-list-item" onclick="window.open('https://line.me/R/ti/p/@732fqlwh', '_blank')"><i class="bi bi-headset"></i> ติดต่อแอดมิน</div>
                <div class="menu-list-item text-danger fw-bold" id="btnLogout"><i class="bi bi-box-arrow-right text-danger"></i> ออกจากระบบ</div>
            </div>
        </main>

    </div>

    <nav class="bottom-nav">
        <div class="nav-item active" data-target="tab-home"><i class="bi bi-house-door"></i>หน้าแรก</div>
        <div class="nav-item" data-target="tab-rewards"><i class="bi bi-gift"></i>ของรางวัล</div>
        <div class="nav-item" data-target="tab-history"><i class="bi bi-clock-history"></i>ประวัติ</div>
        <div class="nav-item" data-target="tab-profile"><i class="bi bi-person"></i>โปรไฟล์</div>
        <div class="d-none" id="nav-notifications"></div>
    </nav>
  `;

  // === Navigation Logic ===
  document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', function() {
          document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active')); this.classList.add('active');
          document.querySelectorAll('.mobile-section').forEach(sec => sec.classList.remove('active'));
          document.getElementById(this.getAttribute('data-target')).classList.add('active'); window.scrollTo(0, 0);
      });
  });

  // === Actions ===
  document.getElementById("btnLogout").addEventListener("click", () => { localStorage.clear(); sessionStorage.clear(); window.location.href = "index.html"; });
  
  document.getElementById("nav-notifications").addEventListener("click", () => {
    let nHtml = '<div class="text-start mt-2">';
    if (notifications.length === 0) nHtml += '<div class="text-center py-4 text-muted">ไม่มีการแจ้งเตือนใหม่</div>'; 
    else {
        nHtml += '<ul class="list-group list-group-flush mb-3" style="max-height: 300px; overflow-y: auto;">';
        notifications.forEach((n) => { nHtml += `<li class="list-group-item px-1 py-3"><strong class="text-primary d-block mb-1 small">${new Date(n.timestamp).toLocaleDateString("th-TH")}</strong><span class="text-dark small">${n.message}</span></li>`; });
        nHtml += '</ul>';
    }
    Swal.fire({ title: '<h5 class="fw-bold text-start">การแจ้งเตือน</h5>', html: nHtml, showConfirmButton: false, showCloseButton: true });
  });

  document.getElementById("btnEditEmail").addEventListener("click", () => {
      Swal.fire({ title: "แก้ไขอีเมล", html: `<input id="swal-input-email" type="email" class="form-control mb-2" placeholder="example@email.com" value="${user.email || ""}"><input id="swal-input-pass" type="password" class="form-control" placeholder="ใส่รหัสผ่านเพื่อยืนยัน">`, showCancelButton: true, confirmButtonText: "บันทึก", confirmButtonColor: "#3b4b5b", preConfirm: () => [document.getElementById("swal-input-email").value, document.getElementById("swal-input-pass").value] })
      .then((res) => { if (res.value) { const [newEmail, pass] = res.value; if (!newEmail || !pass) return Swal.fire("ข้อมูลไม่ครบ", "", "error"); apiCall("updateEmail", { phone: cleanPhone, newEmail, hashedPassword: hashPassword(pass) }).then(() => location.reload()); } });
  });

  document.querySelectorAll(".redeem-btn").forEach(btn => {
      btn.addEventListener("click", function() {
          Swal.fire({ title: "ยืนยันการแลกรางวัล?", text: `ต้องการแลก "${this.dataset.rewardName}" ใช่ไหม?`, icon: "question", showCancelButton: true, confirmButtonColor: "#10b981", confirmButtonText: "ยืนยัน" }).then(res => {
              if (res.isConfirmed) apiCall("redeemReward", { memberPhone: cleanPhone, rewardId: this.dataset.rewardId }).then(() => Swal.fire("สำเร็จ", "แลกของรางวัลแล้ว กรุณาแคปหน้าจอแจ้งแอดมิน", "success").then(() => location.reload()));
          });
      });
  });
}

// ==========================================
// 🔥 ADMIN DASHBOARD (คลีนๆ มี Topbar ชัดเจน)
// ==========================================
function handleAdminPage() {
  const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
  if (!userStr) { window.location.href = "index.html"; return; }
  const adminUser = JSON.parse(userStr);
  if (!adminUser.isAdmin) { window.location.href = "index.html"; return; }
  
  const app = document.getElementById("app");
  
  const adminStyles = `<style>body { background: #f4f6f8; font-family: 'Kanit', sans-serif; } .admin-card { background: white; border-radius: 12px; border: none; box-shadow: 0 4px 15px rgba(0,0,0,0.03); padding: 25px; margin-bottom: 20px;} .topbar { background: #3b4b5b; color: white; padding: 15px 20px; border-radius: 0 0 16px 16px; margin-bottom: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);}</style>`;

  app.innerHTML = adminStyles + `
        <div class="topbar d-flex justify-content-between align-items-center">
            <h4 class="mb-0 fw-bold"><i class="bi bi-star-circle me-2"></i>ระบบหลังบ้าน</h4>
            <div class="d-flex align-items-center">
                <span class="me-3 d-none d-md-block"><i class="bi bi-person-badge me-1"></i>${adminUser.firstName}</span>
                <button id="logoutBtn" class="btn btn-sm btn-outline-light rounded-pill"><i class="bi bi-box-arrow-right me-1"></i>ออกจากระบบ</button>
            </div>
        </div>

        <div class="container-fluid" style="max-width: 1200px;">
            <div class="row g-4">
                <div class="col-lg-7">
                    <div class="admin-card">
                        <h5 class="fw-bold mb-4" style="color:#3b4b5b;"><i class="bi bi-qr-code-scan me-2"></i>สแกนและจัดการแต้ม</h5>
                        <div class="input-group mb-4">
                            <button class="btn btn-light border" id="scanBarcodeBtn"><i class="bi bi-qr-code-scan fs-5"></i></button>
                            <input type="text" id="searchPhone" class="form-control" placeholder="กรอกเบอร์โทรศัพท์ลูกค้า...">
                            <button class="btn text-white" id="searchBtn" style="background:#3b4b5b;">ค้นหา</button>
                        </div>
                        
                        <div id="customerActions" class="d-none">
                            <div id="customerDetails" class="p-3 mb-4 rounded-3 border bg-light d-flex justify-content-between align-items-center"></div>
                            
                            <form id="pointsForm" class="p-4 border rounded-3 bg-white">
                                <h6 class="fw-bold mb-3 text-success">ทำรายการแต้มให้ลูกค้า</h6>
                                <div class="row g-2 mb-3">
                                    <div class="col-md-5"><label class="small text-muted mb-1">จำนวนแต้ม (+ หรือ -)</label><input type="number" id="pointsChange" class="form-control" placeholder="เช่น 20 หรือ -10" required></div>
                                    <div class="col-md-7"><label class="small text-muted mb-1">เหตุผล</label><input type="text" id="reason" class="form-control" placeholder="เช่น ยอดซื้อ 400 บาท" required></div>
                                </div>
                                <label class="small text-muted mb-1">แนบสลิป (ถ้ามี)</label>
                                <input type="file" id="pointsImage" class="form-control mb-4" accept="image/*">
                                <button type="submit" class="btn btn-success w-100 rounded-pill fw-bold">ยืนยันทำรายการ</button>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="col-lg-5">
                    <div class="admin-card">
                        <h5 class="fw-bold mb-4" style="color:#3b4b5b;"><i class="bi bi-gift me-2"></i>เพิ่มของรางวัล/โปรโมชั่น</h5>
                        <form id="addRewardForm">
                            <div class="mb-2"><label class="small text-muted">ชื่อของรางวัล</label><input type="text" id="rewardName" class="form-control" required></div>
                            <div class="mb-2"><label class="small text-muted">รายละเอียด</label><textarea id="rewardDesc" class="form-control" rows="2"></textarea></div>
                            <div class="row g-2 mb-3">
                                <div class="col-6"><label class="small text-muted">ใช้แต้ม</label><input type="number" id="rewardPoints" class="form-control" required></div>
                                <div class="col-6"><label class="small text-muted">ใช้เงินเพิ่ม</label><input type="number" id="rewardCash" class="form-control" value="0"></div>
                            </div>
                            <div class="mb-3">
                                <label class="small text-muted">หมวดหมู่</label>
                                <select id="rewardCategory" class="form-select" required>
                                    <option value="ส่วนลด">ส่วนลด</option><option value="สินค้าพรีเมียม">สินค้าพรีเมียม</option>
                                    <option value="โปรประจำสัปดาห์">โปรประจำสัปดาห์ (จำกัดวันแสดง)</option>
                                </select>
                            </div>

                            <div id="daySelectorContainer" class="mb-4 d-none p-3 bg-light rounded border">
                                <label class="small fw-bold text-primary mb-2">เลือกวันแสดงโปรโมชั่น</label>
                                <div class="d-flex flex-wrap gap-2">
                                    <div class="form-check"><input class="form-check-input promo-day" type="checkbox" value="1" id="d1"><label class="form-check-label small" for="d1">จ.</label></div><div class="form-check"><input class="form-check-input promo-day" type="checkbox" value="2" id="d2"><label class="form-check-label small" for="d2">อ.</label></div><div class="form-check"><input class="form-check-input promo-day" type="checkbox" value="3" id="d3"><label class="form-check-label small" for="d3">พ.</label></div><div class="form-check"><input class="form-check-input promo-day" type="checkbox" value="4" id="d4"><label class="form-check-label small" for="d4">พฤ.</label></div><div class="form-check"><input class="form-check-input promo-day" type="checkbox" value="5" id="d5"><label class="form-check-label small" for="d5">ศ.</label></div><div class="form-check"><input class="form-check-input promo-day" type="checkbox" value="6" id="d6"><label class="form-check-label small text-danger" for="d6">ส.</label></div><div class="form-check"><input class="form-check-input promo-day" type="checkbox" value="0" id="d0"><label class="form-check-label small text-danger" for="d0">อา.</label></div>
                                </div>
                            </div>
                            <button type="submit" class="btn text-white w-100 rounded-pill fw-bold" style="background:#3b4b5b;">บันทึกเข้าระบบ</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;

  document.getElementById("logoutBtn").addEventListener("click", () => { localStorage.clear(); sessionStorage.clear(); window.location.href = "index.html"; });

  document.getElementById("rewardCategory").addEventListener("change", function() {
      if (this.value === "โปรประจำสัปดาห์") document.getElementById("daySelectorContainer").classList.remove("d-none");
      else document.getElementById("daySelectorContainer").classList.add("d-none");
  });

  let currentCustomerPhone = null;
  const searchAction = () => {
    const phone = document.getElementById("searchPhone").value; if (!phone) return;
    apiCall("searchUser", { phone }).then((user) => {
        currentCustomerPhone = user.phone.replace(/'/g, '');
        document.getElementById("customerDetails").innerHTML = `<div><h6 class="fw-bold mb-0">${user.firstName} ${user.lastName}</h6><small class="text-muted">${currentCustomerPhone}</small></div><div class="text-end"><h4 class="text-primary mb-0">${user.totalPoints} <span class="fs-6">พอยท์</span></h4>${user.expiringPoints > 0 ? `<button id="btnNotify" class="btn btn-sm btn-danger mt-1 px-2 py-0"><i class="bi bi-bell"></i> เตือนหมดอายุ</button>` : ''}</div>`;
        document.getElementById("customerActions").classList.remove("d-none");
        
        if(document.getElementById("btnNotify")) {
            document.getElementById("btnNotify").addEventListener("click", () => {
                apiCall("sendNotification", { message: `แต้มของคุณกำลังจะหมดอายุ ${user.expiringPoints} แต้ม อย่าลืมมาใช้นะคะ!`, targetUser: currentCustomerPhone, adminPhone: adminUser.phone }).then(() => Swal.fire("สำเร็จ","ส่งแจ้งเตือนแล้ว","success"));
            });
        }
      }).catch(() => Swal.fire("ไม่พบข้อมูล", "", "warning"));
  };
  document.getElementById("searchBtn").addEventListener("click", searchAction);

  document.getElementById("scanBarcodeBtn").addEventListener("click", () => {
      if (typeof Html5QrcodeScanner === 'undefined') return;
      Swal.fire({ html: '<div id="qr-reader"></div>', showConfirmButton: false, showCloseButton: true, didOpen: () => {
              const html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
              html5QrcodeScanner.render((text) => { html5QrcodeScanner.clear(); Swal.close(); document.getElementById("searchPhone").value = text; searchAction(); }, () => {});
      }});
  });

  document.getElementById("pointsForm").addEventListener("submit", (e) => {
    e.preventDefault(); const file = document.getElementById("pointsImage").files[0];
    const process = (img = null, mime = null) => {
        apiCall("managePoints", { memberPhone: currentCustomerPhone, pointsChange: parseInt(document.getElementById("pointsChange").value, 10), reason: document.getElementById("reason").value, adminPhone: adminUser.phone, imageBase64: img, imageMimeType: mime }).then(() => { Swal.fire("สำเร็จ", "", "success"); document.getElementById("pointsForm").reset(); searchAction(); });
    };
    if (file) { showLoading("อัปโหลด..."); const r = new FileReader(); r.onload = (e) => process(e.target.result, file.type); r.readAsDataURL(file); } else process();
  });

  document.getElementById("addRewardForm").addEventListener("submit", (e) => {
    e.preventDefault(); let selectedDays = [];
    if (document.getElementById("rewardCategory").value === "โปรประจำสัปดาห์") {
        document.querySelectorAll(".promo-day:checked").forEach(cb => selectedDays.push(cb.value));
        if(selectedDays.length === 0) return Swal.fire("แจ้งเตือน", "กรุณาเลือกวัน", "warning");
    }
    const payload = { name: document.getElementById("rewardName").value, description: document.getElementById("rewardDesc").value, pointsRequired: parseInt(document.getElementById("rewardPoints").value, 10), cashRequired: parseInt(document.getElementById("rewardCash").value, 10) || 0, category: document.getElementById("rewardCategory").value, isNew: true, adminPhone: adminUser.phone, activeDays: selectedDays.join(",") };
    apiCall("addReward", payload).then(() => { Swal.fire("สำเร็จ", "", "success"); document.getElementById("addRewardForm").reset(); document.getElementById("daySelectorContainer").classList.add("d-none"); });
  });
}
