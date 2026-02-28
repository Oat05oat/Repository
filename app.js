// <<<<<<<<<<<< ใส่ URL ของ WEB APP จาก GOOGLE APPS SCRIPT ตรงนี้ >>>>>>>>>>>>>
const GAS_URL = "https://script.google.com/macros/s/AKfycbwz_WIhmE84bYpcTkMrE6tK5J3SQDlxDH3W5Dv3Pq3P7kWxVxegU5RNp0x-QmSCcsHspw/exec";
// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

if (typeof Html5QrcodeScanner === "undefined") {
  const script = document.createElement("script");
  script.src = "https://unpkg.com/html5-qrcode";
  document.head.appendChild(script);
}

const MAINTENANCE_ENABLED = false;
const RE_ENABLE_DATETIME_STRING = "2026-02-28T02:00:00";

function showLoading(title = "Loading...") {
  Swal.fire({
    title: title,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
    customClass: { popup: 'rounded-4' }
  });
}

function apiCall(action, payload) {
  if (!Swal.isVisible()) showLoading("กำลังโหลด...");
  return fetch(GAS_URL, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload }),
  })
    .then((res) => res.json())
    .then((res) => {
      Swal.close();
      if (res.status === "error") throw new Error(res.message);
      return res.data;
    })
    .catch((err) => {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: err.message, confirmButtonColor: '#1e293b' });
      throw err;
    });
}

function hashPassword(password) {
  return CryptoJS.SHA256(password).toString();
}

document.addEventListener("DOMContentLoaded", () => {
  const page = window.location.pathname.split("/").pop() || "index.html";
  const yearSpan = document.getElementById("copyright-year") || document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
  
  if (page.includes("index.html") || page === "") handleLoginPage();
  else if (page.includes("register.html")) handleRegisterPage();
  else if (page.includes("dashboard.html")) handleDashboardPage();
  else if (page.includes("admin.html")) handleAdminPage();
});

// === Login Page (รหัสผ่าน & OTP) ===
function handleLoginPage() {
  if (MAINTENANCE_ENABLED && new Date() < new Date(RE_ENABLE_DATETIME_STRING)) {
    const authCard = document.querySelector(".auth-card");
    if (authCard) authCard.style.display = "none";
    Swal.fire({
      icon: "info",
      title: "ปิดปรับปรุงระบบชั่วคราว",
      text: "จะเปิดใช้งานในวันที่ " + new Date(RE_ENABLE_DATETIME_STRING).toLocaleString('th-TH'),
      allowOutsideClick: false,
      showConfirmButton: false,
    });
    return;
  }

  const rememberedUser = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
  if (rememberedUser) {
    window.location.href = JSON.parse(rememberedUser).isAdmin ? "admin.html" : "dashboard.html";
    return;
  }

  // 1. Login แบบรหัสผ่าน
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const phone = document.getElementById("phone").value;
      const password = document.getElementById("password").value;
      const rememberMe = document.getElementById("rememberMe").checked;
      apiCall("login", { phone, hashedPassword: hashPassword(password) })
        .then((data) => {
          if (rememberMe) localStorage.setItem("loggedInUser", JSON.stringify(data.user));
          else sessionStorage.setItem("loggedInUser", JSON.stringify(data.user));
          Swal.fire({ icon: "success", title: "เข้าสู่ระบบสำเร็จ", timer: 1500, showConfirmButton: false })
          .then(() => { window.location.href = data.user.isAdmin ? "admin.html" : "dashboard.html"; });
        });
    });
  }

  // 2. Login แบบ OTP
  const loginOtpForm = document.getElementById("loginOtpForm");
  if (loginOtpForm) {
    loginOtpForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const identifier = document.getElementById("otpIdentifier").value;
      apiCall("requestEmailOtp", { identifier }).then((otpResponse) => {
        let timerInterval;
        Swal.fire({
          title: "ยืนยันรหัส OTP",
          html: `<div class="text-start mt-2"><p class="text-muted small mb-2">รหัสส่งไปที่อีเมลแล้ว</p><p class="small fw-bold mb-3 text-info">Ref: ${otpResponse.refno}</p><input id="swal-input-otp-login" class="form-control text-center fs-4 py-2" placeholder="รหัส 6 หลัก" maxlength="6"><div id="otp-timer-login" class="mt-3 text-center small text-muted"></div></div>`,
          showCancelButton: true, confirmButtonText: "เข้าสู่ระบบ", confirmButtonColor: "#1e293b",
          preConfirm: () => {
            const val = document.getElementById("swal-input-otp-login").value;
            if (!val) Swal.showValidationMessage("กรุณากรอกรหัส OTP!");
            return val;
          },
          didOpen: () => {
            let timeLeft = 300;
            timerInterval = setInterval(() => {
              timeLeft--;
              const m = Math.floor(timeLeft / 60).toString().padStart(2, "0");
              const s = (timeLeft % 60).toString().padStart(2, "0");
              document.getElementById("otp-timer-login").innerHTML = `หมดอายุใน ${m}:${s} นาที`;
              if (timeLeft <= 0) clearInterval(timerInterval);
            }, 1000);
          },
          willClose: () => clearInterval(timerInterval),
        }).then((res) => {
          if (res.isConfirmed && res.value) {
            apiCall("verifyEmailOtp", { identifier, otp: res.value, isForLogin: true })
            .then((data) => {
              sessionStorage.setItem("loggedInUser", JSON.stringify(data.user));
              window.location.href = data.user.isAdmin ? "admin.html" : "dashboard.html";
            });
          }
        });
      });
    });
  }

  // ลืมรหัสผ่าน
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", (e) => {
      e.preventDefault();
      Swal.fire({
        title: "ลืมรหัสผ่าน",
        html: `<p class="small text-muted">ระบุเบอร์โทรเพื่อรับ OTP ทางอีเมล</p><input id="swal-input-identifier" type="text" class="form-control" placeholder="เบอร์โทรศัพท์">`,
        showCancelButton: true, confirmButtonText: "ขอ OTP",
        preConfirm: () => document.getElementById("swal-input-identifier").value,
      }).then((res) => {
        if (res.isConfirmed && res.value) {
          apiCall("requestEmailOtp", { identifier: res.value }).then(() => {
            Swal.fire({
              title: "ยืนยัน OTP",
              html: `<input id="swal-input-otp" class="form-control text-center fs-4" placeholder="รหัส 6 หลัก" maxlength="6">`,
              showCancelButton: true, confirmButtonText: "ยืนยัน",
              preConfirm: () => document.getElementById("swal-input-otp").value,
            }).then((otpRes) => {
              if (otpRes.isConfirmed && otpRes.value) {
                apiCall("verifyEmailOtp", { identifier: res.value, otp: otpRes.value }).then(() => {
                  Swal.fire({
                    title: "ตั้งรหัสใหม่",
                    html: `<input id="swal-new-pass" type="password" class="form-control" placeholder="รหัสผ่านใหม่">`,
                    showCancelButton: true, confirmButtonText: "บันทึก",
                    preConfirm: () => document.getElementById("swal-new-pass").value,
                  }).then((passRes) => {
                    if (passRes.isConfirmed && passRes.value) {
                      apiCall("resetPassword", { phone: res.value, newHashedPassword: hashPassword(passRes.value) })
                      .then(() => Swal.fire("สำเร็จ", "เปลี่ยนรหัสผ่านแล้ว", "success"));
                    }
                  });
                });
              }
            });
          });
        }
      });
    });
  }
}

// === Register ===
function handleRegisterPage() {
  const registerForm = document.getElementById("registerForm");
  const registerBtn = document.getElementById("registerBtn");
  const policyCheckbox = document.getElementById("policyCheckbox");
  const viewPolicyLink = document.getElementById("viewPolicyLink");

  if (policyCheckbox) policyCheckbox.addEventListener("change", function () { registerBtn.disabled = !this.checked; });
  
  if (viewPolicyLink) {
    viewPolicyLink.addEventListener("click", (e) => {
      e.preventDefault();
      Swal.fire({
        title: 'นโยบายความเป็นส่วนตัว',
        html: `<div class="text-start p-2" style="font-size:0.9rem;">
          <b>1. การเก็บรวบรวม:</b> เราจัดเก็บชื่อ เบอร์โทร และอีเมลเพื่อใช้ในระบบสมาชิก<br><br>
          <b>2. การใช้งาน:</b> ข้อมูลใช้เพื่อสะสมพอยท์ แลกรางวัล และความปลอดภัย<br><br>
          <b>3. ความปลอดภัย:</b> เราจะไม่เปิดเผยข้อมูลแก่บุคคลที่สามโดยไม่ได้รับอนุญาต
        </div>`,
        confirmButtonText: 'รับทราบ', confirmButtonColor: '#4f46e5', showCloseButton: true
      });
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;
      if (password !== confirmPassword) return Swal.fire("ผิดพลาด", "รหัสผ่านไม่ตรงกัน", "error");
      
      apiCall("register", {
        firstName: document.getElementById("firstName").value,
        lastName: document.getElementById("lastName").value,
        phone: document.getElementById("phone").value,
        email: document.getElementById("email").value,
        hashedPassword: hashPassword(password),
      }).then(() => Swal.fire("สำเร็จ", "สมัครสมาชิกเรียบร้อย", "success").then(() => window.location.href = "index.html"));
    });
  }
}

// === Dashboard (ลูกค้า) ===
function handleDashboardPage() {
  const rememberedUser = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
  if (!rememberedUser) { window.location.href = "index.html"; return; }
  const loggedInUser = JSON.parse(rememberedUser);
  
  apiCall("getFullDashboardData", { phone: loggedInUser.phone }).then((data) => {
    renderDashboard(data.user, data.notifications, data.rewards);
  }).catch(() => { window.location.href = "index.html"; });
}

// ฟังก์ชัน Global สำหรับดูรหัสคูปอง (เพิ่มใหม่)
window.viewCoupon = (code, name, status) => {
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(code)}`;
  Swal.fire({
    title: '<h5 class="fw-bold">รายละเอียดคูปอง</h5>',
    html: `<div class="p-3 bg-light rounded-4 text-center">
            <p class="mb-2"><b>${name}</b></p>
            <img src="${qr}" class="my-3 p-2 bg-white border shadow-sm" style="width:180px;">
            <div class="p-3 border border-2 border-dashed rounded-4 fw-bold fs-4 bg-white">${code}</div>
            <p class="mt-3 fw-bold ${status === 'used' ? 'text-success' : 'text-warning'}">${status === 'used' ? 'ใช้งานแล้ว' : 'รอใช้สิทธิ์ที่หน้าร้าน'}</p>
           </div>`,
    showCloseButton: true, confirmButtonText: 'ปิดหน้าต่าง', confirmButtonColor: '#1e293b'
  });
};

function renderDashboard(user, notifications, rewards) {
  const app = document.getElementById("app");
  const cleanPhone = user.phone.replace(/'/g, "");
  const currentDay = new Date().getDay().toString();
  const rewardsByCategory = rewards.reduce((acc, r) => { (acc[r.category] = acc[r.category] || []).push(r); return acc; }, {});

  // ปรับแต่ง CSS ให้ Navy & Silver ชัดเจนขึ้น
  const customStyles = `<style>
    body { background: #f1f5f9; }
    .nav-navy { background: linear-gradient(180deg, #1e293b 0%, #334155 100%); height: 200px; border-radius: 0 0 40px 40px; }
    .card-main { background: white; border-radius: 30px; padding: 25px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #e2e8f0; }
    .nav-bottom { position: fixed; bottom: 0; left: 0; width: 100%; background: white; display: flex; padding: 15px 0; border-radius: 25px 25px 0 0; box-shadow: 0 -10px 30px rgba(0,0,0,0.03); z-index: 1000; }
    .nav-item.active { color: #4f46e5; font-weight: bold; }
    .nav-item i { font-size: 1.5rem; display: block; }
    .mobile-section { display: none; padding: 20px 20px 100px; max-width: 500px; margin: -60px auto 0; }
    .mobile-section.active { display: block; animation: fadeInUp 0.4s ease; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  </style>`;

  app.innerHTML = customStyles + `
    <div class="nav-navy position-relative">
        <div class="p-4 d-flex justify-content-between">
            <h4 class="text-white fw-bold">LuckyPository</h4>
            <div id="notiBtn" class="text-white position-relative" style="cursor:pointer;"><i class="bi bi-bell-fill fs-4"></i>${notifications.length > 0 ? '<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="font-size:0.6rem;">'+notifications.length+'</span>' : ''}</div>
        </div>
    </div>

    <div class="container">
        <main id="tab-home" class="mobile-section active">
            <div class="card-main text-center">
                <div class="bg-light rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width:70px; height:70px; font-size:2rem; color:#1e293b; border:2px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,0.1);">${user.firstName[0]}</div>
                <h5 class="fw-bold mb-0">${user.firstName} ${user.lastName}</h5>
                <p class="text-muted small mb-4">ID: ${user.memberId}</p>
                <p class="text-muted small fw-bold mb-1">แต้มสะสม</p>
                <h1 style="font-size: 3.5rem; font-weight: 900; color: #1e293b;">${user.totalPoints}</h1>
            </div>
            <div class="card-main text-center">
                <p class="fw-bold mb-3 text-secondary">คิวอาร์โค้ดของฉัน</p>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cleanPhone}" class="border p-2 rounded-4 mb-3" style="width:140px;">
                <h5 class="fw-bold tracking-widest">${cleanPhone}</h5>
            </div>
        </main>

        <main id="tab-rewards" class="mobile-section">
            <h6 class="fw-bold mb-3 text-primary">ของรางวัล</h6>
            <div class="row g-2">
                ${rewards.map(r => {
                    const isAvail = r.activeDays ? r.activeDays.toString().split(",").includes(currentDay) : true;
                    const canRedeem = user.totalPoints >= r.pointsRequired && isAvail;
                    return `<div class="col-6 mb-2">
                        <div class="card-main p-3 h-100 text-center border-0 shadow-sm" style="border-radius:20px;">
                            <b class="d-block text-truncate small">${r.name}</b>
                            <button class="btn btn-sm w-100 rounded-pill mt-3 fw-bold redeem-btn" data-id="${r.rewardId}" data-name="${r.name}" ${canRedeem ? '' : 'disabled'} style="background:${canRedeem ? '#1e293b':'#f1f5f9'}; color:${canRedeem ? '#fff':'#aaa'}; border:none;">
                                ${r.pointsRequired} P ${r.cashRequired > 0 ? '+ '+r.cashRequired+'฿' : ''}
                            </button>
                        </div>
                    </div>`;
                }).join("")}
            </div>
        </main>

        <main id="tab-history" class="mobile-section">
            <h6 class="fw-bold mb-3">ประวัติรายการ</h6>
            ${user.pointsHistory.map(h => `
                <div class="card-main p-3 d-flex justify-content-between align-items-center mb-2" onclick="${h.refCode ? `viewCoupon('${h.refCode}','${h.reason}','${h.status}')` : ''}" style="cursor:${h.refCode ? 'pointer':'default'}">
                    <div><b>${h.reason}</b><br><small class="text-muted">${new Date(h.timestamp).toLocaleDateString('th-TH')}</small></div>
                    <div class="text-end">
                        <span class="fw-bold ${h.pointsChange > 0 ? 'text-success':'text-danger'}">${h.pointsChange > 0 ? '+':''}${h.pointsChange}</span>
                        ${h.refCode ? '<br><small class="text-primary fw-bold">ดูรหัส</small>' : ''}
                    </div>
                </div>
            `).join("")}
        </main>
    </div>

    <nav class="nav-bottom">
        <div class="nav-item flex-fill text-center active" data-target="tab-home"><i class="bi bi-house-door-fill"></i>หน้าแรก</div>
        <div class="nav-item flex-fill text-center" data-target="tab-rewards"><i class="bi bi-gift-fill"></i>รางวัล</div>
        <div class="nav-item flex-fill text-center" data-target="tab-history"><i class="bi bi-receipt"></i>ประวัติ</div>
        <div class="nav-item flex-fill text-center" id="btnLogOut"><i class="bi bi-box-arrow-right"></i>ออก</div>
    </nav>`;

  // Events
  document.querySelectorAll('.nav-item[data-target]').forEach(btn => {
    btn.onclick = function() {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active')); this.classList.add('active');
        document.querySelectorAll('.mobile-section').forEach(s => s.classList.remove('active'));
        document.getElementById(this.dataset.target).classList.add('active');
    };
  });

  document.getElementById("notiBtn").onclick = () => {
    let content = notifications.map(n => `<div class="p-3 border-bottom text-start"><small class="text-muted">${new Date(n.timestamp).toLocaleString()}</small><p class="mb-0 small">${n.message}</p></div>`).join("");
    Swal.fire({ title: 'แจ้งเตือน', html: `<div style="max-height:400px; overflow-y:auto;">${content || 'ไม่มีแจ้งเตือน'}</div>`, showCloseButton: true, showConfirmButton: false });
  };

  document.querySelectorAll(".redeem-btn").forEach(btn => {
    btn.onclick = async function() {
        const ok = await Swal.fire({ title: 'ยืนยันการแลก?', text: this.dataset.name, showCancelButton: true, confirmButtonColor: '#10b981' });
        if (ok.isConfirmed) {
            const res = await apiCall("redeemReward", { memberPhone: cleanPhone, rewardId: this.dataset.id });
            window.viewCoupon(res.refCode, this.dataset.name, 'pending');
            // รีโหลดแต้มใหม่โดยไม่ต้องรีเฟรชหน้า (ทางเลือก) หรือสั่ง location.reload()
        }
    };
  });

  document.getElementById("btnLogOut").onclick = () => { localStorage.clear(); sessionStorage.clear(); window.location.href = "index.html"; };
}

// === หน้า Admin ===
function handleAdminPage() {
  const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
  if (!userStr || !JSON.parse(userStr).isAdmin) { window.location.href = "index.html"; return; }
  const adminUser = JSON.parse(userStr);

  const app = document.getElementById("app");
  app.innerHTML = `
    <style>body { background: #1e293b; color: white; }</style>
    <div class="container py-4" style="max-width: 650px;">
        <h3 class="text-center fw-bold mb-4">ADMIN LuckyShop24</h3>
        <div class="card p-4 shadow-lg border-0 mb-4" style="border-radius:30px; color:#333;">
            <div class="input-group mb-3 shadow-sm" style="border-radius:15px; overflow:hidden;">
                <button class="btn btn-primary px-4" id="adminScanBtn"><i class="bi bi-qr-code-scan"></i> สแกน</button>
                <input type="text" id="adminInp" class="form-control border-0 bg-light" placeholder="เบอร์โทร หรือ รหัส RWD-...">
                <button class="btn btn-dark px-4 fw-bold" id="adminSearchBtn">ค้นหา</button>
            </div>
            <div id="adminRes" class="d-none p-4 rounded-4 bg-light text-center mb-3"></div>
            <form id="adminPtForm" class="d-none">
                <div class="row g-2">
                    <div class="col-4"><input type="number" id="admPts" class="form-control rounded-3" placeholder="+/-" required></div>
                    <div class="col-8"><input type="text" id="admRea" class="form-control rounded-3" placeholder="เหตุผล" required></div>
                </div>
                <button type="submit" class="btn btn-success w-100 mt-3 fw-bold rounded-pill py-2 shadow-sm">บันทึกพอยท์</button>
            </form>
        </div>
        
        <div class="card p-4 shadow-lg border-0" style="border-radius:30px; color:#333;">
            <h6 class="fw-bold mb-3"><i class="bi bi-plus-circle-fill text-success"></i> เพิ่มรางวัลใหม่</h6>
            <form id="frmAddR">
                <input type="text" id="rn" class="form-control mb-2 rounded-3" placeholder="ชื่อรางวัล" required>
                <div class="row g-2 mb-2">
                    <div class="col-6"><input type="number" id="rp" class="form-control rounded-3" placeholder="ใช้แต้ม" required></div>
                    <div class="col-6"><input type="number" id="rc" class="form-control rounded-3" placeholder="เพิ่มเงิน(ถ้ามี)" value="0"></div>
                </div>
                <select id="rcat" class="form-select mb-3 rounded-3" required>
                    <option value="ส่วนลดทั่วไป">ส่วนลดทั่วไป</option>
                    <option value="แลกเงินสด">แลกเงินสด</option>
                    <option value="โปรประจำสัปดาห์">โปรประจำสัปดาห์</option>
                </select>
                <button type="submit" class="btn btn-primary w-100 fw-bold rounded-pill py-2">เพิ่มเข้าระบบ</button>
            </form>
        </div>
        <div class="text-center mt-5"><button class="btn btn-link text-white-50 text-decoration-none" id="adminLogout">ออกจากระบบ</button></div>
    </div>`;

  const searchAction = async () => {
    const val = document.getElementById("adminInp").value.trim();
    if (!val) return;
    if (val.toUpperCase().startsWith("RWD-")) {
        const ok = await Swal.fire({ title: 'ยืนยันการใช้คูปอง?', text: val, showCancelButton: true, confirmButtonColor: '#10b981' });
        if (ok.isConfirmed) { await apiCall("useCoupon", { code: val }); Swal.fire('สำเร็จ', 'ใช้งานคูปองแล้ว', 'success'); }
    } else {
        const user = await apiCall("searchUser", { phone: val });
        const res = document.getElementById("adminRes");
        res.classList.remove("d-none");
        res.innerHTML = `<h5>${user.firstName} ${user.lastName}</h5><h1 class="text-primary fw-bold">${user.totalPoints}</h1>
            <div class="d-flex gap-2 mt-3">
                <button class="btn btn-sm btn-outline-primary flex-fill rounded-pill" onclick="quickOp('changePhone','${user.phone}')">แก้เบอร์</button>
                <button class="btn btn-sm btn-outline-danger flex-fill rounded-pill" onclick="quickOp('suspendUser','${user.phone}')">ระงับบัญชี</button>
            </div>`;
        document.getElementById("adminPtForm").classList.remove("d-none");
    }
  };

  document.getElementById("adminSearchBtn").onclick = searchAction;
  document.getElementById("adminLogout").onclick = () => { localStorage.clear(); location.reload(); };

  document.getElementById("adminScanBtn").onclick = () => {
    Swal.fire({
      title: 'สแกน QR Code',
      html: '<div id="admin-reader" style="width:100%; border-radius:15px; overflow:hidden; background:#000;"></div><input type="file" id="admin-f" accept="image/*" class="form-control mt-3 shadow-sm">',
      showCancelButton: true, showConfirmButton: false,
      didOpen: () => {
        const scanner = new Html5Qrcode("admin-reader");
        const onOk = (t) => { scanner.stop().then(() => { document.getElementById("adminInp").value = t; Swal.close(); searchAction(); }); };
        scanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 250 }, onOk).catch(()=>{});
        document.getElementById("admin-f").onchange = e => { if (e.target.files[0]) scanner.scanFile(e.target.files[0], true).then(onOk); };
      }
    });
  };

  document.getElementById("adminPtForm").onsubmit = async (e) => {
    e.preventDefault();
    await apiCall("managePoints", { memberPhone: document.getElementById("adminInp").value, pointsChange: document.getElementById("admPts").value, reason: document.getElementById("admRea").value });
    Swal.fire("สำเร็จ", "จัดการพอยท์เรียบร้อย", "success"); searchAction();
  };
}

// ฟังก์ชันทางลัด Admin
window.quickOp = async (act, phone) => {
    if (act === 'changePhone') {
        const { value: n } = await Swal.fire({ title: 'เบอร์ใหม่', input: 'text', inputValue: phone });
        if (n) await apiCall("changePhone", { old: phone, new: n });
    } else {
        const ok = await Swal.fire({ title: 'ระงับบัญชี?', icon: 'warning', showCancelButton: true });
        if (ok.isConfirmed) await apiCall("suspendUser", { phone: phone });
    }
    Swal.fire("สำเร็จ", "ดำเนินการแล้ว", "success");
};

