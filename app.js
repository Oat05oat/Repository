const GAS_URL = "https://script.google.com/macros/s/AKfycbwz_WIhmE84bYpcTkMrE6tK5J3SQDlxDH3W5Dv3Pq3P7kWxVxegU5RNp0x-QmSCcsHspw/exec";

// --- ฟังก์ชันสื่อสาร API กลาง ---
async function apiCall(action, payload) {
    if (!Swal.isVisible()) showLoading();
    try {
        const response = await fetch(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action, payload })
        });
        const res = await response.json();
        Swal.close();
        if (res.status === "error") throw new Error(res.message);
        return res.data;
    } catch (err) {
        Swal.fire({ icon: "error", title: "ข้อผิดพลาด", text: err.message, confirmButtonColor: '#3b4b5b' });
        throw err;
    }
}

function showLoading() { Swal.fire({ title: 'กำลังโหลด...', allowOutsideClick: false, didOpen: () => Swal.showLoading() }); }
function hashPassword(password) { return CryptoJS.SHA256(password).toString(); }

// --- ตัวควบคุมหน้าเว็บ (Router) ---
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname.toLowerCase();
    
    // ตรวจสอบว่าอยู่ที่หน้าไหน
    if (path.includes("admin")) {
        handleAdminPage();
    } else if (path.includes("dashboard")) {
        handleDashboardPage();
    } else if (path.includes("register")) {
        handleRegisterPage();
    } else {
        handleLoginPage();
    }
});

// ==========================================
// [1] หน้าเข้าสู่ระบบ (LOGIN)
// ==========================================
function handleLoginPage() {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const phone = document.getElementById("phone").value;
            const pass = document.getElementById("password").value;
            const user = await apiCall("login", { phone, hashedPassword: hashPassword(pass) });
            const storage = document.getElementById("rememberMe").checked ? localStorage : sessionStorage;
            storage.setItem("loggedInUser", JSON.stringify(user.user));
            window.location.href = user.user.isAdmin ? "admin.html" : "dashboard.html";
        };
    }

    // ระบบลืมรหัสผ่าน (ส่ง OTP เข้าอีเมล)
    const forgotLink = document.getElementById("forgotPasswordLink");
    if (forgotLink) {
        forgotLink.onclick = async (e) => {
            e.preventDefault();
            const { value: id } = await Swal.fire({ title: 'ลืมรหัสผ่าน', input: 'text', inputPlaceholder: 'เบอร์โทร หรือ อีเมล', showCancelButton: true });
            if (id) {
                await apiCall("requestEmailOtp", { identifier: id });
                const { value: otp } = await Swal.fire({ title: 'กรอก OTP จากอีเมล', input: 'text', maxlength: 6 });
                if (otp) {
                    await apiCall("verifyEmailOtp", { identifier: id, otp: otp });
                    const { value: newPass } = await Swal.fire({ title: 'ตั้งรหัสผ่านใหม่', input: 'password', inputPlaceholder: 'รหัสผ่านใหม่' });
                    if (newPass) {
                        await apiCall("resetPassword", { phone: id, newHashedPassword: hashPassword(newPass) });
                        Swal.fire("สำเร็จ", "เปลี่ยนรหัสผ่านเรียบร้อย", "success");
                    }
                }
            }
        };
    }
}

// ==========================================
// [2] หน้าสมัครสมาชิก (REGISTER)
// ==========================================
function handleRegisterPage() {
    const regForm = document.getElementById("registerForm");
    const policyCheck = document.getElementById("policyCheckbox");
    const regBtn = document.getElementById("registerBtn");

    if (policyCheck) policyCheck.onchange = () => regBtn.disabled = !policyCheck.checked;

    if (regForm) {
        regForm.onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                firstName: document.getElementById("firstName").value,
                lastName: document.getElementById("lastName").value,
                phone: document.getElementById("phone").value,
                email: document.getElementById("email").value,
                hashedPassword: hashPassword(document.getElementById("password").value)
            };
            await apiCall("register", payload);
            Swal.fire("สำเร็จ", "สมัครสมาชิกเรียบร้อย", "success").then(() => window.location.href = "index.html");
        };
    }
}

// ==========================================
// [3] หน้าลูกค้า (DASHBOARD) - ดีไซน์ใหม่ Navy-Silver
// ==========================================
async function handleDashboardPage() {
    const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    if (!userStr) { window.location.href = "index.html"; return; }
    const loggedInUser = JSON.parse(userStr);
    
    const data = await apiCall("getFullDashboardData", { phone: loggedInUser.phone });
    renderDashboard(data);
}

function renderDashboard(data) {
    const { user, rewards, notifications } = data;
    const app =
