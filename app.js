const GAS_URL = "https://script.google.com/macros/s/AKfycbwz_WIhmE84bYpcTkMrE6tK5J3SQDlxDH3W5Dv3Pq3P7kWxVxegU5RNp0x-QmSCcsHspw/exec"; 

// ตรวจสอบเครื่องมือสแกน
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
  
  // ตั้งค่าปีลิขสิทธิ์
  const yearEl = document.getElementById('copyright-year') || document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  if (path.includes("register")) handleRegisterPage();
  else if (path.includes("dashboard")) handleDashboardPage();
  else if (path.includes("admin")) handleAdminPage();
  else handleLoginPage();
});

// ==========================================
// 1. ระบบ Login & ลืมรหัสผ่าน (UI เดิม)
// ==========================================
function handleLoginPage() {
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if(forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            Swal.fire({
                title: '<h4 class="fw-bold">ลืมรหัสผ่าน?</h4>',
                html: `<p class="text-muted small">ระบุเบอร์โทรศัพท์เพื่อรับ OTP ทางอีเมลที่ลงทะเบียนไว้</p>
                       <input type="tel" id="swal-forgot-phone" class="form-control text-center fs-5" placeholder="08XXXXXXXX" maxlength="10">`,
                showCancelButton: true,
                confirmButtonColor: '#3b4b5b',
                confirmButtonText: 'ขอรหัส OTP',
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
                            html: `<p class="text-muted small">รหัสส่งไปที่อีเมลที่ผูกกับเบอร์ ${phone} แล้ว</p>
                                   <input type="text" id="swal-forgot-otp" class="form-control text-center py-3 fw-bold" style="letter-spacing: 10px; font-size: 1.5rem;" placeholder="------" maxlength="6">`,
                            showCancelButton: true,
                            confirmButtonColor: '#3b4b5b',
                            confirmButtonText: 'ยืนยันรหัส',
                            preConfirm: () => document.getElementById('swal-forgot-otp').value
                        }).then((otpResult) => {
                            if(otpResult.isConfirmed) {
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
                                }).then((passResult) => {
                                    if(passResult.isConfirmed) {
                                        apiCall("resetPassword", { phone: phone, newHashedPassword: hashPassword(passResult.value) }).then(() => {
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
    
    // โค้ด Login เดิม...
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

// ==========================================
// 2. หน้าสมัครสมาชิก (UI เดิม)
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
                confirmButtonText: 'รับทราบ'
            });
        });
    }
    // ... ฟังก์ชัน Submit สมัครสมาชิกเดิม
}

// ==========================================
// 3. หน้าลูกค้า (แก้ไขข้อมูล & QR คูปอง)
// ==========================================
window.showHistoryReward = function(reason, date, refCode, status) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(refCode)}`;
    const isUsed = status === 'used';
    Swal.fire({
        title: '<h5 class="fw-bold text-primary">รายละเอียดคูปอง</h5>',
        html: `
            <div class="p-3 bg-light rounded border text-center">
                <p class="small text-muted mb-2">รายการ: ${reason}</p>
                <img src="${qrUrl}" class="img-fluid border mb-3 p-1 bg-white" style="width:160px; ${isUsed ? 'opacity:0.3; filter:grayscale(1);' : ''}">
                <div class="p-2 border border-dashed rounded bg-white fw-bold fs-4">${refCode}</div>
                <div class="mt-3">${isUsed ? '<span class="text-success fw-bold">ใช้งานแล้ว</span>' : '<span class="text-warning fw-bold">รอการใช้งาน</span>'}</div>
            </div>
            ${!isUsed ? '<p class="text-danger small mt-2">กรุณาแคปหน้าจอเพื่อยืนยันกับแอดมิน</p>' : ''}`,
        confirmButtonColor: '#3b4b5b',
        confirmButtonText: 'ปิด'
    });
};

function handleDashboardPage() {
    const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    if (!userStr) { window.location.href = "index.html"; return; }
    const loggedInUser = JSON.parse(userStr);
    apiCall("getFullDashboardData", { phone: loggedInUser.phone }).then(data => renderDashboard(data.user, data.notifications, data.rewards));
}

// ใน renderDashboard ผมจะแก้เฉพาะส่วนปุ่มแก้ไขข้อมูลเพื่อความปลอดภัย
// (คุณสามารถใช้โค้ด HTML เดิมใน dashboard.html ของคุณได้เลย)

// ==========================================
// 4. หน้า Admin (สแกนแบบเลือกรูปได้ & ปุ่มจัดการ)
// ==========================================
function handleAdminPage() {
    const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    if (!userStr) { window.location.href = "index.html"; return; }
    
    // ฟังก์ชันย่อยสำหรับแอดมิน (เรียกจากปุ่ม)
    window.editCustomerPhone = function(p) {
        Swal.fire({ title: 'แก้เบอร์โทรศัพท์', input: 'text', inputValue: p, showCancelButton: true }).then(res => {
            if(res.isConfirmed) apiCall("changePhone", { old: p, new: res.value }).then(() => Swal.fire('สำเร็จ','เปลี่ยนเบอร์แล้ว','success'));
        });
    };
    window.suspendCustomer = function(p) {
        Swal.fire({ title: 'ระงับบัญชี?', text: p, icon: 'warning', showCancelButton: true }).then(res => {
            if(res.isConfirmed) apiCall("suspendUser", { phone: p }).then(() => Swal.fire('ระงับแล้ว','บัญชีถูกระงับชั่วคราว','success'));
        });
    };

    // ระบบสแกนที่รองรับการแนบภาพ (แก้ปัญหา "ไม่มีเครื่องอ่าน")
    const setupScanner = () => {
        Swal.fire({
            title: 'สแกน QR / แนบรูปคูปอง',
            html: `
                <div id="qr-reader" style="width:100%; border-radius:10px; overflow:hidden; background:#000;"></div>
                <div class="mt-3">
                    <label class="small text-muted d-block mb-1">หรือเลือกรูปภาพคูปองจากเครื่อง</label>
                    <input type="file" id="qr-file-input" accept="image/*" class="form-control form-control-sm">
                </div>
            `,
            showCancelButton: true,
            showConfirmButton: false,
            didOpen: () => {
                const html5QrCode = new Html5Qrcode("qr-reader");
                const onScanSuccess = (decodedText) => {
                    html5QrCode.stop().then(() => {
                        document.getElementById("searchPhone").value = decodedText;
                        Swal.close();
                        searchAction(); // ค้นหาออโต้
                    });
                };
                
                // เริ่มกล้อง
                html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onScanSuccess).catch(() => {});

                // สแกนจากไฟล์ภาพ
                document.getElementById("qr-file-input").addEventListener("change", e => {
                    if (e.target.files[0]) {
                        html5QrCode.scanFile(e.target.files[0], true)
                        .then(onScanSuccess)
                        .catch(() => Swal.showValidationMessage("อ่านภาพไม่ได้ กรุณาใช้ภาพที่ชัดเจน"));
                    }
                });
            }
        });
    };

    // ผูก Event กับปุ่มเดิมในหน้า HTML ของคุณ
    const scanBtn = document.getElementById("scanBarcodeBtn");
    if(scanBtn) scanBtn.addEventListener("click", setupScanner);

    const searchBtn = document.getElementById("searchBtn");
    const searchAction = () => {
        const val = document.getElementById("searchPhone").value.trim();
        if (val.toUpperCase().startsWith("RWD-")) {
            Swal.fire({
                title: 'ยืนยันการใช้คูปอง',
                text: val,
                showCancelButton: true,
                confirmButtonText: 'ใช้คูปองนี้'
            }).then(res => {
                if(res.isConfirmed) apiCall("useCoupon", { code: val }).then(() => Swal.fire('สำเร็จ','คูปองถูกใช้งานแล้ว','success'));
            });
        } else {
            apiCall("searchUser", { phone: val }).then(user => {
                const details = document.getElementById("customerDetails");
                details.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center bg-white p-3 rounded shadow-sm border">
                        <div><h6 class="fw-bold mb-0">${user.firstName}</h6><small>${user.phone}</small></div>
                        <div class="h4 fw-bold text-primary mb-0">${user.totalPoints}</div>
                    </div>
                    <div class="mt-2 d-flex gap-1">
                        <button class="btn btn-sm btn-info text-white flex-fill" onclick="editCustomerPhone('${user.phone}')">แก้เบอร์</button>
                        <button class="btn btn-sm btn-danger flex-fill" onclick="suspendCustomer('${user.phone}')">ระงับ</button>
                    </div>`;
                details.classList.remove("d-none");
                document.getElementById("pointsForm").classList.remove("d-none");
            });
        }
    };
    if(searchBtn) searchBtn.addEventListener("click", searchAction);
}
