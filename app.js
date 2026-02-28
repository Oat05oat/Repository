const GAS_URL = "https://script.google.com/macros/s/AKfycbwz_WIhmE84bYpcTkMrE6tK5J3SQDlxDH3W5Dv3Pq3P7kWxVxegU5RNp0x-QmSCcsHspw/exec";

// ฟังก์ชันเรียก API (ปรับปรุงให้ไวและไม่บั๊ก)
async function apiCall(action, payload) {
    showLoading();
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
        Swal.fire({ icon: "error", title: "ผิดพลาด", text: err.message });
        throw err;
    }
}

function showLoading() {
    Swal.fire({ title: 'กำลังโหลด...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
}

// เริ่มต้นระบบ
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("admin")) {
        handleAdminPage();
    } else if (path.includes("dashboard")) {
        handleDashboardPage();
    } else {
        handleLoginPage();
    }
});

// ==========================================
// 1. หน้าแอดมิน (สแกนได้ + แต้มไม่หาย + แก้เบอร์ได้)
// ==========================================
function handleAdminPage() {
    const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    if (!userStr) { window.location.href = "index.html"; return; }

    const app = document.getElementById("app");
    app.innerHTML = `
    <style>body { background: #445566; font-family: 'Kanit', sans-serif; color: #333; }</style>
    <div class="container py-4" style="max-width: 600px;">
        <div class="card p-4 shadow-lg border-0 mb-4" style="border-radius:20px;">
            <h5 class="fw-bold mb-3 text-primary">แผงควบคุม Admin</h5>
            <div class="input-group mb-3">
                <button class="btn btn-outline-primary" id="scanBtn"><i class="bi bi-qr-code-scan"></i></button>
                <input type="text" id="searchVal" class="form-control" placeholder="เบอร์โทร หรือ รหัส RWD-...">
                <button class="btn btn-dark" id="btnGo">ตกลง</button>
            </div>
            <div id="resArea" class="d-none mt-3 p-3 bg-light rounded-3 border"></div>
        </div>
        
        <div class="card p-4 shadow-lg border-0" style="border-radius:20px;">
            <h6 class="fw-bold mb-3">เพิ่มรางวัลใหม่</h6>
            <input type="text" id="rName" class="form-control mb-2" placeholder="ชื่อสินค้า/รางวัล">
            <div class="row g-2 mb-2">
                <div class="col-6"><input type="number" id="rPoints" class="form-control" placeholder="ใช้แต้ม"></div>
                <div class="col-6"><input type="number" id="rCash" class="form-control" placeholder="เงินเพิ่ม (ถ้ามี)"></div>
            </div>
            <select id="rCat" class="form-select mb-3">
                <option value="ส่วนลดทั่วไป">ส่วนลดทั่วไป</option>
                <option value="ส่วนลดสินค้าพรีเมี่ยม">ส่วนลดสินค้าพรีเมี่ยม</option>
                <option value="แลกเงินสด">แลกเงินสด</option>
                <option value="เสริมประกัน">เสริมประกัน</option>
                <option value="โปรประจำสัปดาห์">โปรประจำสัปดาห์</option>
            </select>
            <button class="btn btn-success w-100 fw-bold" id="btnSaveReward">บันทึกรางวัล</button>
        </div>
        <button class="btn btn-link text-white-50 w-100 mt-3" onclick="localStorage.clear();location.reload();">ออกจากระบบ</button>
    </div>`;

    let currentPhone = "";

    // ปุ่มสแกนแบบอเนกประสงค์
    document.getElementById("scanBtn").onclick = () => {
        Swal.fire({
            title: 'สแกนรหัส',
            html: '<div id="reader" style="width:100%; border-radius:10px; overflow:hidden;"></div><input type="file" id="fIn" accept="image/*" class="form-control mt-2">',
            didOpen: () => {
                const scanner = new Html5Qrcode("reader");
                const finish = (t) => { scanner.stop(); document.getElementById("searchVal").value = t; Swal.close(); document.getElementById("btnGo").click(); };
                scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, finish);
                document.getElementById("fIn").onchange = e => scanner.scanFile(e.target.files[0], true).then(finish);
            }
        });
    };

    document.getElementById("btnGo").onclick = async () => {
        const val = document.getElementById("searchVal").value.trim();
        if (!val) return;

        if (val.toUpperCase().startsWith("RWD-")) {
            const ok = await Swal.fire({ title: 'ยืนยันใช้คูปอง?', text: val, showCancelButton: true });
            if (ok.isConfirmed) {
                await apiCall("useCoupon", { code: val });
                Swal.fire("สำเร็จ", "คูปองถูกใช้แล้ว", "success");
            }
        } else {
            const user = await apiCall("searchUser", { phone: val });
            currentPhone = user.phone;
            const resArea = document.getElementById("resArea");
            resArea.classList.remove("d-none");
            resArea.innerHTML = `
                <div class="d-flex justify-content-between">
                    <div><b>${user.firstName}</b><br><small>${user.phone}</small></div>
                    <div class="h4 text-primary">${user.totalPoints}</div>
                </div>
                <div class="mt-3">
                    <input type="number" id="ptChange" class="form-control mb-2" placeholder="แต้ม +/-">
                    <input type="text" id="ptReason" class="form-control mb-2" placeholder="เหตุผล">
                    <button class="btn btn-sm btn-success w-100 mb-2" id="btnUpdatePt">บันทึกแต้ม</button>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-info flex-fill" onclick="adminOp('changePhone','${user.phone}')">แก้เบอร์</button>
                        <button class="btn btn-sm btn-outline-danger flex-fill" onclick="adminOp('suspendUser','${user.phone}')">ระงับ</button>
                    </div>
                </div>`;
            
            document.getElementById("btnUpdatePt").onclick = async () => {
                const pts = document.getElementById("ptChange").value;
                const reason = document.getElementById("ptReason").value;
                await apiCall("managePoints", { memberPhone: currentPhone, pointsChange: pts, reason: reason });
                Swal.fire("สำเร็จ", "ปรับแต้มแล้ว", "success");
                document.getElementById("btnGo").click(); // รีโหลดข้อมูล
            };
        }
    };
}

// ฟังก์ชันจัดการ Admin Action
window.adminOp = async (act, phone) => {
    if (act === 'changePhone') {
        const { value: newP } = await Swal.fire({ title: 'เบอร์ใหม่', input: 'text', inputValue: phone });
        if (newP) await apiCall("changePhone", { old: phone, new: newP });
    } else {
        const ok = await Swal.fire({ title: 'ระงับบัญชี?', icon: 'warning', showCancelButton: true });
        if (ok.isConfirmed) await apiCall("suspendUser", { phone: phone });
    }
    Swal.fire("สำเร็จ", "ดำเนินการแล้ว", "success");
};

// ==========================================
// 2. หน้าลูกค้า DASHBOARD (แก้ปุ่มกดไม่ได้ + คืนดีไซน์สวย)
// ==========================================
function handleDashboardPage() {
    const userStr = localStorage.getItem("loggedInUser") || sessionStorage.getItem("loggedInUser");
    if (!userStr) { window.location.href = "index.html"; return; }
    const user = JSON.parse(userStr);
    apiCall("getFullDashboardData", { phone: user.phone }).then(data => renderDashboard(data));
}

function renderDashboard(data) {
    const { user, notifications, rewards } = data;
    const app = document.getElementById("app");
    const cleanPhone = user.phone.replace(/'/g, '');

    app.innerHTML = `
    <style>
        body { background: linear-gradient(180deg, #556677 0%, #f4f6f8 300px); font-family: 'Kanit', sans-serif; }
        .mobile-section { display: none; padding: 20px; }
        .mobile-section.active { display: block; }
        .clean-card { background: #fff; border-radius: 20px; padding: 20px; margin-bottom: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
        .bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; background: #fff; display: flex; border-top: 1px solid #eee; z-index: 1000; }
        .nav-item { flex: 1; text-align: center; padding: 10px; color: #aaa; cursor: pointer; }
        .nav-item.active { color: #3b4b5b; font-weight: bold; }
        .nav-item i { font-size: 1.5rem; display: block; }
    </style>
    
    <div style="height:140px;"></div>
    <div class="text-center mb-4">
        <div style="width:80px; height:80px; background:#fff; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:2rem; box-shadow:0 4px 10px rgba(0,0,0,0.1);">${user.firstName[0]}</div>
        <h5 class="mt-2 fw-bold text-dark">${user.firstName} ${user.lastName}</h5>
    </div>

    <div id="main-content">
        <section id="tab-home" class="mobile-section active">
            <div class="clean-card text-center py-4">
                <p class="text-muted small mb-1">พอยท์สะสม</p>
                <h1 style="font-size: 3rem; font-weight: 800; color: #3b4b5b;">${user.totalPoints}</h1>
            </div>
            <div class="clean-card text-center">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cleanPhone}" style="width:130px;">
                <p class="mt-2 fw-bold">${cleanPhone}</p>
            </div>
        </section>

        <section id="tab-rewards" class="mobile-section">
            <h6 class="fw-bold mb-3">คูปองและของรางวัล</h6>
            <div class="row g-2">
                ${rewards.map(r => `
                    <div class="col-6">
                        <div class="clean-card p-3 h-100 text-center">
                            <b class="d-block text-truncate">${r.name}</b>
                            <small class="text-muted d-block mb-2" style="height:30px; overflow:hidden;">${r.description}</small>
                            <button class="btn btn-sm btn-dark w-100 rounded-pill" onclick="redeem('${r.rewardId}','${r.name}')">แลก ${r.pointsRequired} พอยท์</button>
                        </div>
                    </div>
                `).join("")}
            </div>
        </section>

        <section id="tab-history" class="mobile-section">
            <h6 class="fw-bold mb-3">ประวัติรายการ</h6>
            ${user.pointsHistory.map(h => `
                <div class="clean-card p-3 mb-2 d-flex justify-content-between align-items-center">
                    <div><b>${h.reason}</b><br><small class="text-muted">${new Date(h.timestamp).toLocaleDateString()}</small></div>
                    <span class="fw-bold ${h.pointsChange > 0 ? 'text-success' : 'text-danger'}">${h.pointsChange}</span>
                </div>
            `).join("")}
        </section>
    </div>

    <nav class="bottom-nav">
        <div class="nav-item active" onclick="switchTab('tab-home', this)"><i class="bi bi-house"></i>หน้าแรก</div>
        <div class="nav-item" onclick="switchTab('tab-rewards', this)"><i class="bi bi-gift"></i>คูปอง</div>
        <div class="nav-item" onclick="switchTab('tab-history', this)"><i class="bi bi-clock"></i>ประวัติ</div>
        <div class="nav-item" onclick="switchTab('tab-profile', this)"><i class="bi bi-person"></i>โปรไฟล์</div>
    </nav>`;
}

// ฟังก์ชันสลับ Tab (แก้ปุ่มกดไม่ได้)
window.switchTab = (id, el) => {
    document.querySelectorAll('.mobile-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    el.classList.add('active');
};

window.redeem = async (id, name) => {
    const ok = await Swal.fire({ title: 'ยืนยันการแลก?', text: name, showCancelButton: true });
    if (ok.isConfirmed) {
        const res = await apiCall("redeemReward", { memberPhone: JSON.parse(localStorage.getItem("loggedInUser")).phone, rewardId: id });
        Swal.fire("สำเร็จ", "รหัสของคุณคือ: " + res.refCode, "success").then(() => location.reload());
    }
};
