// <<<<<<<<<<<< ใส่ URL ของ WEB APP จาก GOOGLE APPS SCRIPT ตรงนี้ >>>>>>>>>>>>>
const GAS_URL = "https://script.google.com/macros/s/AKfycbwz_WIhmE84bYpcTkMrE6tK5J3SQDlxDH3W5Dv3Pq3P7kWxVxegU5RNp0x-QmSCcsHspw/exec";
// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

if (typeof Html5QrcodeScanner === "undefined") {
  const script = document.createElement("script");
  script.src = "https://unpkg.com/html5-qrcode";
  document.head.appendChild(script);
}

const MAINTENANCE_ENABLED = false;
const RE_ENABLE_DATETIME_STRING = "2026-02-28T22:30:59";

function showLoading(title = "Loading...") {
  Swal.fire({
    title: title,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
    customClass: { popup: 'rounded-5' }
  });
}

function apiCall(action, payload) {
  showLoading("กำลังโหลด...");
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

    const reEnableDate = new Date(RE_ENABLE_DATETIME_STRING).toLocaleString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    Swal.fire({
      title: '<h3 class="fw-bold mt-2" style="color: #1e293b;">ปิดปรับปรุงระบบชั่วคราว</h3>',
      html: `
        <div class="text-center p-2">
          <div class="mb-4">
            <i class="bi bi-gear-fill text-secondary" style="font-size: 4rem; animation: rotate 4s linear infinite; display: inline-block;"></i>
          </div>
          <p class="text-muted mb-4">ขออภัยในความไม่สะดวก ขณะนี้เรากำลังพัฒนาระบบเพื่อประสิทธิภาพที่ดียิ่งขึ้น</p>
          <div class="p-3 rounded-4 border" style="background: #f1f5f9; border-style: dashed !important;">
            <small class="text-primary fw-bold d-block mb-1">คาดว่าจะเปิดใช้งานอีกครั้งในวันที่:</small>
            <span class="text-dark fw-bold" style="font-size: 1.1rem;">${reEnableDate} น.</span>
          </div>
          <div class="mt-4 small text-muted fst-italic">ขอบคุณสมาชิก LuckyShop24 ทุกท่านที่ไว้วางใจ</div>
        </div>
        <style>
          @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .swal2-popup { border-top: 8px solid #1e293b !important; }
        </style>
      `,
      allowOutsideClick: false,
      showConfirmButton: false,
      width: '500px',
      customClass: {
        popup: 'rounded-5 shadow-lg'
      }
    });
    return;
  }

  const rememberedUser =
    localStorage.getItem("loggedInUser") ||
    sessionStorage.getItem("loggedInUser");
  if (rememberedUser) {
    window.location.href = JSON.parse(rememberedUser).isAdmin
      ? "admin.html"
      : "dashboard.html";
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
          if (rememberMe)
            localStorage.setItem("loggedInUser", JSON.stringify(data.user));
          else
            sessionStorage.setItem("loggedInUser", JSON.stringify(data.user));
          Swal.fire({
            icon: "success",
            title: "เข้าสู่ระบบสำเร็จ",
            timer: 1500,
            showConfirmButton: false,
          }).then(() => {
            window.location.href = data.user.isAdmin
              ? "admin.html"
              : "dashboard.html";
          });
        })
        .catch(console.error);
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
          showCancelButton: true,
          confirmButtonText: "เข้าสู่ระบบ",
          confirmButtonColor: "#1e293b",
          showCloseButton: true,
          customClass: { popup: 'rounded-5' },
          preConfirm: () => {
            const val = document.getElementById("swal-input-otp-login").value;
            if (!val) Swal.showValidationMessage("กรุณากรอกรหัส OTP!");
            return val;
          },
          didOpen: () => {
            const timerEl = document.getElementById("otp-timer-login");
            let timeLeft = 300;
            timerInterval = setInterval(() => {
              timeLeft--;
              const m = Math.floor(timeLeft / 60)
                .toString()
                .padStart(2, "0");
              const s = (timeLeft % 60).toString().padStart(2, "0");
              timerEl.innerHTML = `หมดอายุใน ${m}:${s} นาที`;
              if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerEl.innerHTML = "รหัสหมดอายุแล้ว";
              }
            }, 1000);
          },
          willClose: () => clearInterval(timerInterval),
        }).then((res) => {
          if (res.isConfirmed && res.value) {
            apiCall("verifyEmailOtp", {
              identifier,
              otp: res.value,
              isForLogin: true,
            }).then((data) => {
              sessionStorage.setItem("loggedInUser", JSON.stringify(data.user));
              Swal.fire({
                icon: "success",
                title: "เข้าสู่ระบบสำเร็จ",
                timer: 1500,
                showConfirmButton: false,
              }).then(() => {
                window.location.href = data.user.isAdmin
                  ? "admin.html"
                  : "dashboard.html";
              });
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
        html: `<p class="small text-muted mb-3">กรุณาระบุข้อมูลเพื่อขอรับรหัสผ่านชั่วคราวทางอีเมล</p><input id="swal-input-identifier" type="text" class="form-control text-center py-2" placeholder="เบอร์โทร หรือ อีเมล">`,
        showCancelButton: true,
        confirmButtonText: "ขอ OTP",
        confirmButtonColor: "#4f46e5",
        showCloseButton: true,
        customClass: { popup: "rounded-5" },
        preConfirm: () => {
          const val = document.getElementById("swal-input-identifier").value;
          if (!val) Swal.showValidationMessage("กรุณากรอกข้อมูล!");
          return val;
        },
      }).then((res) => {
        if (res.isConfirmed && res.value) {
          apiCall("requestEmailOtp", { identifier: res.value }).then(
            (otpResponse) => {
              Swal.fire({
                title: "ยืนยัน OTP (ลืมรหัส)",
                html: `<div class="text-center mb-2 small text-muted">รหัสอ้างอิง: ${otpResponse.refno}</div><input id="swal-input-otp" class="form-control text-center fs-4 py-2" placeholder="รหัส 6 หลัก" maxlength="6">`,
                showCancelButton: true,
                confirmButtonText: "ยืนยันรหัส",
                confirmButtonColor: "#4f46e5",
                showCloseButton: true,
                customClass: { popup: "rounded-5" },
                preConfirm: () => {
                  const val = document.getElementById("swal-input-otp").value;
                  if (!val) Swal.showValidationMessage("กรุณากรอกรหัส!");
                  return val;
                },
              }).then((otpRes) => {
                if (otpRes.isConfirmed && otpRes.value) {
                  apiCall("verifyEmailOtp", {
                    identifier: res.value,
                    otp: otpRes.value,
                  }).then(() => {
                    Swal.fire({
                      title: "ตั้งรหัสผ่านใหม่",
                      html: `<input id="swal-new-pass" type="password" class="form-control text-center py-2" placeholder="รหัสผ่านใหม่">`,
                      showCancelButton: true,
                      confirmButtonText: "บันทึกรหัสใหม่",
                      confirmButtonColor: "#4f46e5",
                      showCloseButton: true,
                      customClass: { popup: "rounded-5" },
                      preConfirm: () => {
                        const val = document.getElementById("swal-new-pass").value;
                        if (!val) Swal.showValidationMessage("กรุณากรอกรหัส!");
                        return val;
                      },
                    }).then((passRes) => {
                      if (passRes.isConfirmed && passRes.value) {
                        apiCall("updatePassword", {
                          identifier: res.value,
                          newHashedPassword: hashPassword(passRes.value),
                        }).then(() =>
                          Swal.fire({ icon: "success", title: "สำเร็จ", text: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว", confirmButtonColor: "#1e293b" })
                        );
                      }
                    });
                  });
                }
              });
            }
          );
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

  // [แก้ไขจุดบั๊กปุ่มสมัครสมาชิกกดไม่ได้] ปลดล็อกปุ่มตามสถานะการติ๊กกล่อง Checkbox
  if (policyCheckbox && registerBtn) {
    registerBtn.disabled = !policyCheckbox.checked;
    policyCheckbox.addEventListener("change", function () {
      registerBtn.disabled = !this.checked;
    });
  }

  // [แก้ไขลิงก์นโยบายความเป็นส่วนตัวให้แสดงผลสวยงามและปิดง่ายด้วยกากบาท]
  if (viewPolicyLink) {
    viewPolicyLink.addEventListener("click", (e) => {
      e.preventDefault();
      Swal.fire({
        title: '<h5 class="fw-bold mb-0" style="color: #1e293b;">นโยบายความเป็นส่วนตัว</h5>',
        html: `
          <div class="text-start mt-3 p-3 bg-light rounded-4 border" style="font-size: 0.9rem; color: #334155; max-height: 300px; overflow-y: auto;">
            <p class="mb-3"><b>1. การจัดเก็บข้อมูล:</b> ระบบจะจัดเก็บข้อมูลเท่าที่จำเป็น ได้แก่ ชื่อ นามสกุล เบอร์โทรศัพท์ และอีเมลของท่าน</p>
            <p class="mb-3"><b>2. จุดประสงค์ในการใช้งาน:</b> ข้อมูลสมาชิกจะถูกนำไปใช้ในกระบวนการคำนวณแต้ม, ตรวจสอบสิทธิ์การแลกรางวัล และส่งรหัส OTP ทางอีเมลเพื่อความปลอดภัย</p>
            <p class="mb-0"><b>3. การรักษาความปลอดภัยข้อมูล:</b> LuckyShop24 มีมาตรการคุ้มครองข้อมูลของท่านเป็นอย่างดี และจะไม่มีการแชร์หรือเผยแพร่สิทธิ์ข้อมูลสมาชิกให้แก่บุคคลภายนอกในทุกกรณี</p>
          </div>
        `,
        showCloseButton: true,
        confirmButtonText: 'ฉันเข้าใจและยอมรับ',
        confirmButtonColor: '#1e293b',
        customClass: { popup: 'rounded-5 shadow-lg' }
      });
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const firstName = document.getElementById("firstName").value;
      const lastName = document.getElementById("lastName").value;
      const phone = document.getElementById("phone").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;
      if (password !== confirmPassword) {
        Swal.fire({
          title: "ข้อผิดพลาด",
          text: "รหัสผ่านไม่ตรงกัน",
          icon: "error",
        });
        return;
      }
      apiCall("register", {
        firstName,
        lastName,
        phone,
        email,
        hashedPassword: hashPassword(password),
      }).then(() => {
        Swal.fire({
          icon: "success",
          title: "สมัครสมาชิกสำเร็จ!",
          timer: 2000,
          showConfirmButton: false,
        }).then(() => (window.location.href = "index.html"));
      });
    });
  }
}

// === Dashboard (ลูกค้า) ===
function handleDashboardPage() {
  const rememberedUser =
    localStorage.getItem("loggedInUser") ||
    sessionStorage.getItem("loggedInUser");
  if (!rememberedUser) {
    window.location.href = "index.html";
    return;
  }
  const loggedInUser = JSON.parse(rememberedUser);
  if (loggedInUser.isAdmin) {
    window.location.href = "admin.html";
    return;
  }

  apiCall("getFullDashboardData", { phone: loggedInUser.phone })
    .then((data) => {
      renderDashboard(data.user, data.notifications, data.rewards);
    })
    .catch(() => {
      localStorage.removeItem("loggedInUser");
      sessionStorage.removeItem("loggedInUser");
      window.location.href = "index.html";
    });
}

// ฟังก์ชัน Global สำหรับเรียกแสดงคูปอง และเรียกดู QR Code ของรางวัลย้อนหลัง (เพิ่มฟีเจอร์กันลืมแคปสิทธิ์)
window.viewCoupon = (code, name, status) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(code)}`;
  Swal.fire({
    title: '<h5 class="fw-bold mb-0">รายละเอียดคูปองรางวัล</h5>',
    html: `
      <div class="p-3 bg-light rounded-4 border text-center">
        <p class="mb-2"><b>${name}</b></p>
        <div class="bg-white p-3 border rounded-4 d-inline-block mb-3 shadow-sm">
          <img src="${qrUrl}" style="width:170px;" alt="Reward QR">
        </div>
        <div class="p-3 border border-2 border-dashed rounded-4 fw-bold fs-4 bg-white text-primary mb-2" style="letter-spacing: 2px;">
          ${code}
        </div>
        <p class="mt-2 fw-bold ${status === 'used' ? 'text-success' : 'text-warning'}" style="font-size: 0.95rem;">
          สถานะ: ${status === 'used' ? '<i class="bi bi-check-circle-fill"></i> ใช้งานแล้ว' : '<i class="bi bi-clock-history"></i> รอใช้งานสิทธิ์ที่หน้าร้าน'}
        </p>
      </div>
    `,
    showCloseButton: true,
    confirmButtonText: 'ปิดหน้าต่าง',
    confirmButtonColor: '#1e293b',
    customClass: { popup: 'rounded-5' }
  });
};

function renderDashboard(user, notifications, rewards) {
  const app = document.getElementById("app");
  const rewardsByCategory = rewards.reduce((acc, reward) => {
    (acc[reward.category] = acc[reward.category] || []).push(reward);
    return acc;
  }, {});
  const cleanPhone = user.phone.replace(/'/g, ""); // ล้างเครื่องหมาย '

  let expiryMessageHtml = `<p class="mb-0 text-white-50 small"><i class="bi bi-info-circle me-1"></i> แต้มหมดอายุทุก 31 ธ.ค. ของปีถัดไป</p>`;
  if (user.expiringPoints > 0) {
    expiryMessageHtml = `<div class="bg-white text-danger px-3 py-1 rounded-pill d-inline-block small fw-bold shadow-sm" style="animation: pulse 2s infinite;"><i class="bi bi-exclamation-triangle-fill me-1"></i> หมดอายุ ${user.expiringPoints} แต้ม ภายใน ${user.expiryDate}</div>`;
  }

  const customStyles = `<style>
    body { background: #f1f5f9; } 
    .nav-navy { background: linear-gradient(180deg, #1e293b 0%, #334155 100%); height: 200px; border-radius: 0 0 40px 40px; }
    .card-main { background: white; border-radius: 30px; padding: 25px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #e2e8f0; }
    .nav-bottom { position: fixed; bottom: 0; left: 0; width: 100%; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); display: flex; padding: 15px 0; border-radius: 25px 25px 0 0; box-shadow: 0 -10px 30px rgba(0,0,0,0.03); z-index: 1000; }
    .nav-item { flex: 1; text-align: center; color: #94a3b8; font-size: 0.85rem; cursor: pointer; transition: 0.3s; }
    .nav-item.active { color: #4f46e5; font-weight: bold; transform: translateY(-3px); }
    .nav-item i { font-size: 1.5rem; display: block; margin-bottom: 2px; }
    .mobile-section { display: none; padding: 20px 20px 100px; max-width: 500px; margin: -60px auto 0; }
    .mobile-section.active { display: block; animation: fadeInUp 0.4s ease; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  </style>`;

  app.innerHTML = customStyles + `
    <div class="nav-navy position-relative">
        <div class="p-4 d-flex justify-content-between align-items-center">
            <h4 class="text-white fw-bold mb-0" style="letter-spacing: 0.5px;">LuckyShop24</h4>
            <div id="notiBtn" class="text-white position-relative p-2" style="cursor:pointer;">
                <i class="bi bi-bell-fill fs-4"></i>
                ${notifications.length > 0 ? '<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="font-size:0.65rem; padding: 0.35em 0.5em;">' + notifications.length + '</span>' : ''}
            </div>
        </div>
    </div>

    <div class="container">
        <main id="tab-home" class="mobile-section active">
            <div class="card-main text-center shadow-sm">
                <div class="bg-light rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width:75px; height:75px; font-size:2.2rem; color:#1e293b; border:3px solid #fff; box-shadow:0 4px 15px rgba(0,0,0,0.08);">${user.firstName[0].toUpperCase()}</div>
                <h5 class="fw-bold mb-1 text-dark">${user.firstName} ${user.lastName}</h5>
                <p class="text-muted small mb-4">ID: ${user.memberId || '-'}</p>
                <p class="text-muted small fw-bold mb-1" style="letter-spacing: 0.5px;">คะแนนสะสมทั้งหมด</p>
                <h1 class="display-3 fw-bold mb-2" style="color: #1e293b; font-weight: 800; line-height: 1;">${user.totalPoints}</h1>
                <div class="mt-2">${expiryMessageHtml}</div>
            </div>
            <div class="card-main text-center">
                <p class="fw-bold mb-3 text-secondary">คิวอาร์โค้ดสะสมพอยท์</p>
                <div class="bg-light p-3 d-inline-block rounded-4 mb-3 border">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cleanPhone}" class="rounded-2" style="width:140px;">
                </div>
                <h5 class="fw-bold tracking-widest text-dark" style="font-size: 1.25rem;">${cleanPhone}</h5>
            </div>
        </main>

        <main id="tab-rewards" class="mobile-section">
            <h6 class="fw-bold mb-4 text-primary"><i class="bi bi-gift-fill me-1"></i> รายการของรางวัลและส่วนลด</h6>
            <div class="row g-3">
                ${rewards.map(r => {
                    const isAvail = r.activeDays ? r.activeDays.toString().split(",").includes(currentDay) : true;
                    const canRedeem = user.totalPoints >= r.pointsRequired && isAvail;
                    return `<div class="col-6">
                        <div class="card-main p-3 h-100 text-center border-0 shadow-sm d-flex flex-column justify-content-between" style="border-radius:24px;">
                            <div>
                                <b class="d-block text-truncate text-dark mb-1" style="font-size: 0.95rem;">${r.name}</b>
                                <p class="text-muted small mb-3" style="font-size:0.75rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 36px; line-height: 1.3;">${r.description || 'แลกรับสิทธิ์พิเศษ'}</p>
                            </div>
                            <button class="btn btn-sm w-100 rounded-pill fw-bold py-2 redeem-btn" data-id="${r.rewardId}" data-name="${r.name}" ${canRedeem ? '' : 'disabled'} style="background:${canRedeem ? '#1e293b':'#f1f5f9'}; color:${canRedeem ? '#fff':'#94a3b8'}; border:none; font-size: 0.8rem;">
                                แลก ${r.pointsRequired} P ${r.cashRequired > 0 ? ' + ' + r.cashRequired + '฿' : ''}
                            </button>
                        </div>
                    </div>`;
                }).join("")}
            </div>
        </main>

        <main id="tab-history" class="mobile-section">
            <h6 class="fw-bold mb-4 text-dark"><i class="bi bi-clock-history me-1"></i> ประวัติคะแนนและการแลกสิทธิ์</h6>
            ${user.pointsHistory.map(h => {
                const isRedemption = h.refCode && Number(h.pointsChange) < 0;
                return `
                <div class="card-main p-3 d-flex justify-content-between align-items-center mb-2 shadow-sm border-0" 
                     onclick="${isRedemption ? `window.viewCoupon('${h.refCode}','${h.reason}','${h.status}')` : ''}" 
                     style="cursor:${isRedemption ? 'pointer':'default'}; border-radius: 20px;">
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle bg-light d-flex align-items-center justify-content-center me-3" style="width:45px; height:45px; color: ${isRedemption ? '#4f46e5':'#10b981'};">
                            <i class="bi ${isRedemption ? 'bi-gift-fill' : 'bi-plus-circle-fill'} fs-5"></i>
                        </div>
                        <div>
                            <b class="text-dark d-block mb-1" style="font-size: 0.9rem; line-height:1.2;">${h.reason}</b>
                            <small class="text-muted" style="font-size: 0.75rem;"><i class="bi bi-calendar3 me-1"></i>${new Date(h.timestamp).toLocaleDateString('th-TH')}</small>
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="fw-bold fs-5 ${h.pointsChange > 0 ? 'text-success':'text-danger'}">${h.pointsChange > 0 ? '+':''}${h.pointsChange}</span>
                        ${isRedemption ? '<br><span class="badge bg-primary bg-opacity-10 text-primary mt-1 fw-bold" style="font-size:0.65rem; padding: 0.4em 0.6em; border-radius:8px;"><i class="bi bi-qr-code"></i> ดูรหัสคูปอง</span>' : ''}
                    </div>
                </div>`;
            }).join("")}
        </main>

        <main id="tab-profile" class="mobile-section">
            <h6 class="fw-bold mb-4 text-dark"><i class="bi bi-person-fill-gear me-1"></i> ตั้งค่าข้อมูลบัญชี</h6>
            <div class="card-main p-0 overflow-hidden shadow-sm" style="border-radius: 24px;">
                <div class="p-3 border-bottom d-flex align-items-center bg-white cursor-pointer" onclick="window.openSettingsModal('${user.firstName}', '${user.lastName}', '${cleanPhone}', '${user.email || ''}')" style="cursor:pointer;">
                    <i class="bi bi-gear-fill text-muted me-3 fs-5"></i> ข้อมูลส่วนตัวและการตั้งค่า
                </div>
                <div class="p-3 border-bottom d-flex align-items-center bg-white cursor-pointer" onclick="window.open('https://line.me/R/ti/p/@732fqlwh', '_blank')" style="cursor:pointer;">
                    <i class="bi bi-headset text-success me-3 fs-5"></i> แจ้งปัญหาและติดต่อแอดมิน
                </div>
                <div class="p-3 d-flex align-items-center text-danger fw-bold bg-white cursor-pointer" id="btnLogOut" style="cursor:pointer;">
                    <i class="bi bi-box-arrow-right text-danger me-3 fs-5"></i> ออกจากระบบบัญชี
                </div>
            </div>
        </main>
    </div>

    <nav class="nav-bottom">
        <div class="nav-item flex-fill text-center active" data-target="tab-home"><i class="bi bi-house-door-fill"></i>หน้าแรก</div>
        <div class="nav-item flex-fill text-center" data-target="tab-rewards"><i class="bi bi-gift-fill"></i>คูปอง</div>
        <div class="nav-item flex-fill text-center" data-target="tab-history"><i class="bi bi-clock-history"></i>ประวัติ</div>
        <div class="nav-item flex-fill text-center" data-target="tab-profile"><i class="bi bi-person-fill"></i>โปรไฟล์</div>
    </nav>`;

  // แถบเมนูด้านล่างควบคุมการสลับแท็บเมนู
  document.querySelectorAll('.nav-item[data-target]').forEach(btn => {
    btn.onclick = function() {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active')); this.classList.add('active');
        document.querySelectorAll('.mobile-section').forEach(s => s.classList.remove('active'));
        document.getElementById(this.dataset.target).classList.add('active');
        window.scrollTo(0, 0);
    };
  });

  // ฟังก์ชันกล่องข้อความสำหรับการแจ้งเตือนทั่วไปพร้อมกากบาทมุมขวาบน (X) ปิดง่าย
  document.getElementById("notiBtn").onclick = () => {
    let content = notifications.map(n => `<div class="p-3 border-bottom text-start"><small class="text-muted d-block mb-1"><i class="bi bi-clock me-1"></i>${new Date(n.timestamp).toLocaleString('th-TH')}</small><p class="mb-0 text-dark small fw-bold">${n.message}</p></div>`).join("");
    Swal.fire({
      title: '<h5 class="fw-bold mb-0">กล่องข้อความแจ้งเตือน</h5>',
      html: `<div style="max-height:400px; overflow-y:auto; padding-right:4px;">${content || '<div class="py-5 text-muted text-center small">ไม่มีรายการแจ้งเตือนในขณะนี้</div>'}</div>`,
      showCloseButton: true,
      showConfirmButton: false,
      customClass: { popup: 'rounded-5' }
    });
  };

  // ฟังก์ชันสิทธิ์การตั้งค่าโปรไฟล์ข้อมูลส่วนตัวของลูกค้า
  window.openSettingsModal = (fname, lname, pnum, emailAddr) => {
    Swal.fire({
      title: "ตั้งค่าบัญชีส่วนตัว",
      html: `
        <div class="text-start mt-2 p-2 bg-light rounded-4 border small">
          <div class="mb-3">
            <label class="small text-muted fw-bold mb-1">ชื่อ - นามสกุลสมาชิก</label>
            <div class="text-dark bg-white p-2 px-3 rounded shadow-sm border border-light">${fname} ${lname}</div>
          </div>
          <div class="mb-3">
            <label class="small text-muted fw-bold mb-1">เบอร์โทรศัพท์ (ไอดีเข้าสู่ระบบ)</label>
            <div class="text-dark bg-white p-2 px-3 rounded shadow-sm border border-light">${pnum}</div>
            <div class="text-danger small mt-2 fw-medium"><i class="bi bi-info-circle-fill me-1"></i>ต้องการเปลี่ยนเบอร์มือถือโปรดติดต่อผู้ดูแลระบบเพื่อย้ายพอยท์คะแนนส่วนกลาง</div>
          </div>
          <div class="mb-2">
            <label class="small text-muted fw-bold mb-1">อีเมลติดต่อรับ OTP</label>
            <div class="d-flex justify-content-between align-items-center bg-white p-2 px-3 rounded shadow-sm border border-light">
              <span class="text-dark text-truncate pe-2">${emailAddr || '<span class="text-warning small"><i class="bi bi-exclamation-triangle me-1"></i>ยังไม่ผูกระบบอีเมล</span>'}</span>
              <button id="swalEditEmailBtn" class="btn btn-sm btn-outline-primary rounded-pill px-3 fw-medium flex-shrink-0"><i class="bi bi-pencil me-1"></i>แก้ไข</button>
            </div>
          </div>
        </div>`,
      showConfirmButton: false,
      showCloseButton: true,
      customClass: { popup: "rounded-5" },
      didOpen: () => {
        document.getElementById("swalEditEmailBtn").addEventListener("click", () => {
          Swal.close();
          Swal.fire({
            title: "แก้ไขอีเมลรับสิทธิ์",
            html: `
              <input id="swal-input-email" type="email" class="swal2-input bg-light border-0" placeholder="กรอกอีเมลใหม่ เช่น pansa2046@gmail.com" value="${emailAddr}" style="border-radius:12px; font-size: 0.95rem; width:85%;">
              <input id="swal-input-pass" type="password" class="swal2-input bg-light border-0" placeholder="ใส่รหัสผ่านเดิมเพื่อยืนยันตัวตน" style="border-radius:12px; font-size: 0.95rem; width:85%;">`,
            showCancelButton: true,
            confirmButtonText: "บันทึกข้อมูล",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#4f46e5",
            showCloseButton: true,
            customClass: { popup: "rounded-5" },
            preConfirm: () => [
              document.getElementById("swal-input-email").value,
              document.getElementById("swal-input-pass").value,
            ],
          }).then((res) => {
            if (res.isConfirmed && res.value) {
              const [newEmail, pass] = res.value;
              if (!newEmail || !pass) return Swal.fire("ข้อมูลไม่ครบ", "กรุณากรอกอีเมลและรหัสผ่านเพื่ออนุมัติสิทธิ์", "error");
              
              apiCall("updateEmail", { phone: pnum, newEmail: newEmail, hashedPassword: hashPassword(pass) })
                .then((data) => Swal.fire("อัปเดตสำเร็จ!", data.message, "success").then(() => location.reload()))
                .catch(console.error);
            }
          });
        });
      }
    });
  };

  // ดักฟังการคลิกปุ่มแลกของรางวัลคูปองร้านค้า
  document.querySelectorAll(".redeem-btn").forEach(btn => {
    btn.onclick = async function() {
        const rewardId = this.dataset.id;
        const rewardName = this.dataset.name;
        const ok = await Swal.fire({ 
          title: 'ยืนยันการใช้แต้มแลกรางวัล?', 
          text: `คุณยืนยันที่จะใช้สิทธิ์เพื่อแลก "${rewardName}" ใช่หรือไม่?`, 
          icon: 'question', 
          showCancelButton: true, 
          confirmButtonColor: '#10b981',
          cancelButtonText: 'ยกเลิก',
          confirmButtonText: 'ยืนยันการแลกรับ',
          showCloseButton: true,
          customClass: { popup: 'rounded-5' }
        });
        if (ok.isConfirmed) {
            const res = await apiCall("redeemReward", { memberPhone: cleanPhone, rewardId: rewardId });
            window.viewCoupon(res.refCode, rewardName, 'pending');
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
        <h3 class="text-center fw-bold mb-4 mt-2" style="letter-spacing: 1px;">แผงควบคุมระบบหลังบ้าน Admin</h3>
        <div class="card p-4 shadow-lg border-0 mb-4" style="border-radius:30px; color:#333;">
            <div class="input-group mb-3 shadow-sm" style="border-radius:15px; overflow:hidden;">
                <button class="btn btn-primary px-4" id="adminScanBtn"><i class="bi bi-qr-code-scan"></i> สแกนตัวสิทธิ์</button>
                <input type="text" id="adminInp" class="form-control border-0 bg-light px-3" placeholder="คลิกสแกน หรือกรอกเบอร์โทร / รหัสคูปอง RWD-...">
                <button class="btn btn-dark px-4 fw-bold" id="adminSearchBtn">ค้นหาข้อมูล</button>
            </div>
            <div id="adminRes" class="d-none p-4 rounded-4 bg-light text-center mb-3"></div>
            <form id="adminPtForm" class="d-none">
                <div class="row g-2">
                    <div class="col-4"><input type="number" id="admPts" class="form-control rounded-3" placeholder="แต้มสะสม +/-" required></div>
                    <div class="col-8"><input type="text" id="admRea" class="form-control rounded-3" placeholder="ระบุเหตุผล/หมายเหตุสิทธิ์" required></div>
                </div>
                <button type="submit" class="btn btn-success w-100 mt-3 fw-bold rounded-pill py-2 shadow-sm">บันทึกพอยท์คะแนน</button>
            </form>
        </div>
        
        <div class="card p-4 shadow-lg border-0" style="border-radius:30px; color:#333;">
            <h6 class="fw-bold mb-3 text-success"><i class="bi bi-plus-circle-fill text-success"></i> เพิ่มของรางวัล/สิทธิ์ร้านค้าใหม่</h6>
            <form id="frmAddR">
                <input type="text" id="rn" class="form-control mb-2 rounded-3" placeholder="ชื่อสินค้า/ของรางวัลสิทธิ์" required>
                <div class="row g-2 mb-2">
                    <div class="col-6"><input type="number" id="rp" class="form-control rounded-3" placeholder="จำนวนแต้มพอยท์ที่ใช้แลก" required></div>
                    <div class="col-6"><input type="number" id="rc" class="form-control rounded-3" placeholder="จำนวนเงินสดที่ต้องจ่ายเพิ่ม (ระบุ 0 ถ้าไม่มี)" value="0"></div>
                </div>
                <select id="rcat" class="form-select mb-3 rounded-3" required>
                    <option value="" disabled selected>เลือกหมวดหมู่กลุ่มรางวัล</option>
                    <option value="ส่วนลดทั่วไป">ส่วนลดทั่วไป</option>
                    <option value="สินค้าพรีเมียม">สินค้าพรีเมียม</option>
                    <option value="แลกเงินสด">แลกเงินสด</option>
                    <option value="เสริมประกัน">เสริมประกัน</option>
                    <option value="โปรประจำสัปดาห์">โปรประจำสัปดาห์</option>
                </select>
                <button type="submit" class="btn btn-primary w-100 fw-bold rounded-pill py-2">ยืนยันบันทึกสิทธิ์ของรางวัล</button>
            </form>
        </div>
        <div class="text-center mt-4"><button class="btn btn-link text-white-50 text-decoration-none small" id="adminLogout"><i class="bi bi-box-arrow-left"></i> ออกจากระบบแผงควบคุม</button></div>
    </div>`;

  const searchAction = async () => {
    const val = document.getElementById("adminInp").value.trim();
    if (!val) return;
    if (val.toUpperCase().startsWith("RWD-")) {
        const ok = await Swal.fire({ title: 'ยืนยันสิทธิ์ใช้งานคูปองของรางวัลนี้?', html: `<div class="p-3 border border-dashed rounded bg-light fw-bold fs-4">${val}</div>`, showCancelButton: true, confirmButtonColor: '#10b981', showCloseButton: true, customClass: { popup: 'rounded-5' } });
        if (ok.isConfirmed) { 
          await apiCall("useCoupon", { code: val }); 
          Swal.fire({ title: 'สำเร็จ', text: 'คูปองสิทธิ์ถูกบันทึกสถานะ "ใช้งานแล้ว" เรียบร้อย', icon: 'success', confirmButtonColor: '#1e293b' }); 
          document.getElementById("adminInp").value = "";
          document.getElementById("adminRes").classList.add("d-none");
          document.getElementById("adminPtForm").classList.add("d-none");
        }
    } else {
        const user = await apiCall("searchUser", { phone: val });
        const res = document.getElementById("adminRes");
        res.classList.remove("d-none");
        res.innerHTML = `
          <div class="d-flex justify-content-between align-items-center text-dark">
             <div class="text-start"><h5><b>${user.firstName} ${user.lastName}</b></h5><small class="text-muted">เบอร์โทรศัพท์: ${user.phone}</small></div>
             <div><h1 class="text-primary fw-bold mb-0">${user.totalPoints}</h1><small class="text-muted fw-bold">แต้มพอยท์สะสม</p></div>
          </div>
          <div class="d-flex gap-2 mt-4">
              <button class="btn btn-sm btn-outline-primary flex-fill rounded-pill py-2 fw-bold" onclick="window.quickAdminOp('changePhone','${user.phone}')">แก้ไขเบอร์โทรศัพท์</button>
              <button class="btn btn-sm btn-outline-danger flex-fill rounded-pill py-2 fw-bold" onclick="window.quickAdminOp('suspendUser','${user.phone}')">ระงับบัญชีสมาชิก</button>
          </div>`;
        document.getElementById("adminPtForm").classList.remove("d-none");
    }
  };

  document.getElementById("adminSearchBtn").onclick = searchAction;
  document.getElementById("adminInp").addEventListener("keypress", (e) => { if (e.key === "Enter") searchAction(); });
  document.getElementById("adminLogout").onclick = () => { localStorage.clear(); location.reload(); };

  // ระบบสแกนอัจฉริยะสำหรับแอดมิน (ปิดและดึงค่าค้นหาให้อัตโนมัติทันทีที่อ่านเจอ)
  document.getElementById("adminScanBtn").onclick = () => {
    Swal.fire({
      title: 'สแกนคิวอาร์โค้ดสิทธิ์คูปอง / สมาชิก',
      html: '<div id="admin-reader" style="width:100%; border-radius:15px; overflow:hidden; background:#000;"></div><div class="mt-3 p-2 bg-light rounded shadow-inner small border"><label class="fw-bold d-block text-muted mb-1">หรือเลือกไฟล์รูปภาพคูปองเพื่อแสกนออโต้</label><input type="file" id="admin-f" accept="image/*" class="form-control border-0 shadow-sm"></div>',
      showCancelButton: true, showConfirmButton: false,
      showCloseButton: true,
      customClass: { popup: 'rounded-5' },
      didOpen: () => {
        const scanner = new Html5Qrcode("admin-reader");
        const onOk = (t) => { scanner.stop().then(() => { document.getElementById("adminInp").value = t; Swal.close(); searchAction(); }); };
        scanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 250 }, onOk).catch(()=>{});
        document.getElementById("admin-f").onchange = e => { if (e.target.files[0]) scanner.scanFile(e.target.files[0], true).then(onOk).catch(() => Swal.showValidationMessage("ไม่อ่านรูปภาพนี้ กรุณาใช้ไฟล์รูปที่ชัดเจน")); };
      }
    });
  };

  // แอดมินบันทึกการปรับคะแนนสะสมแต้มของสมาชิก
  document.getElementById("adminPtForm").onsubmit = async (e) => {
    e.preventDefault();
    await apiCall("managePoints", { memberPhone: document.getElementById("adminInp").value, pointsChange: document.getElementById("admPts").value, reason: document.getElementById("admRea").value });
    Swal.fire({ title: "สำเร็จ", text: "จัดการพอยท์และอัปเดตข้อมูลลูกค้าเรียบร้อยแล้ว", icon: "success", confirmButtonColor: "#1e293b" }); 
    searchAction();
    document.getElementById("adminPtForm").reset();
  };

  // แอดมินเพิ่มรายการของรางวัลใหม่ส่วนกลางเข้าสู่ระบบฐานข้อมูลชีต Rewards
  document.getElementById("frmAddR").onsubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById("rn").value,
      description: "แลกรับสิทธิ์รางวัลในหมวดหมู่ " + document.getElementById("rcat").value,
      pointsRequired: parseInt(document.getElementById("rp").value, 10),
      cashRequired: parseInt(document.getElementById("rc").value, 10) || 0,
      category: document.getElementById("rcat").value,
      isNew: true,
      adminPhone: adminUser.phone
    };
    await apiCall("addReward", payload);
    Swal.fire({ title: "สำเร็จ", text: "เพิ่มของรางวัลใหม่เข้าระบบและแจ้งเตือนสมาชิกเรียบร้อยแล้ว", icon: "success", confirmButtonColor: "#1e293b" });
    document.getElementById("frmAddR").reset();
  };
}

// ฟังก์ชันทางลัด Action การจัดการสิทธิ์เสริมของ Admin (แก้จุด Error บั๊กสแกนเบอร์ขึ้น Invalid Action)
window.quickAdminOp = async (act, phone) => {
    if (act === 'changePhone') {
        const { value: n } = await Swal.fire({ title: 'แก้ไขเบอร์โทรศัพท์ลูกค้า', text: 'กรอกเบอร์โทรศัพท์ใหม่ 10 หลักที่จะใช้แทนเบอร์เดิม:', input: 'text', inputValue: phone, showCancelButton: true, confirmButtonColor: '#4f46e5', showCloseButton: true, customClass: { popup: 'rounded-5' } });
        if (n && n !== phone) {
          await apiCall("changePhone", { old: phone, new: n });
          Swal.fire("สำเร็จ", "เปลี่ยนเบอร์โทรศัพท์และโอนข้อมูลประวัติเรียบร้อยแล้ว", "success");
          document.getElementById("adminInp").value = n;
          document.getElementById("adminSearchBtn").click();
        }
    } else if (act === 'suspendUser') {
        const ok = await Swal.fire({ title: 'ยืนยันระงับบัญชีผู้ใช้นี้?', text: `บัญชีเบอร์โทรศัพท์ลูกค้า ${phone} จะไม่สามารถเข้าใช้งานระบบเพื่อแลกรับพอยท์แต้มสะสมสิทธิ์คูปองได้ชั่วคราว`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ระงับบัญชีใช้งาน', showCloseButton: true, customClass: { popup: 'rounded-5' } });
        if (ok.isConfirmed) {
          await apiCall("suspendUser", { phone: phone });
          Swal.fire("สำเร็จ", "ระงับการเข้าใช้งานบัญชีนี้เรียบร้อยแล้ว", "success");
          document.getElementById("adminSearchBtn").click();
        }
    }
};
