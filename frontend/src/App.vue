<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { Bell, CalendarDays, Database, DoorOpen, FileText, LogIn, LogOut, Mail, Repeat, Search, Settings, ShieldCheck, UserPlus, Users } from '@lucide/vue';
import { api, clearSession, getSession, saveSession } from './api.js';

const API_URL = 'https://meetplanning-production.up.railway.app/api';
const session = ref(getSession());
const view = ref('dashboard');
const authMode = ref('login');
const loading = ref(false);
const toast = ref('');
const dashboard = reactive({ roomCount: 0, pendingCount: 0, todayCount: 0, upcoming: [] });
const rooms = ref([]);
const bookings = ref([]);
const recurring = ref([]);
const waitlist = ref([]);
const notifications = ref([]);
const stats = reactive({ monthly: [], hours: [], rooms: [], cancelRate: [] });
const settings = reactive({ org_name: 'MeetPlanning', primary_color: '#12805c', admin_email: '', smtp_host: '', smtp_port: '587', smtp_user: '', smtp_password: '', smtp_from: '' });
const meta = reactive({ branches: [], buildings: [], equipment: [] });
const loginForm = reactive({ email: 'admin@meetplanning.local', password: 'admin1234' });
const registerForm = reactive({ name: '', email: '', password: '', department: '' });
const searchForm = reactive({ date: new Date().toISOString().slice(0, 10), start: '09:00', end: '10:00', capacity: 4, branchId: '', building: '', equipment: [], q: '' });
const selectedRoom = ref(null);
const bookingForm = reactive({ title: '', purpose: '', attendeeCount: 4, requesterPhone: '', note: '' });
const recurringForm = reactive({ roomId: '', title: '', purpose: '', attendeeCount: 4, requesterPhone: '', note: '', repeatType: 'weekly', startDate: new Date().toISOString().slice(0, 10), endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10), startTime: '09:00', endTime: '10:00' });
const waitlistForm = reactive({ roomId: '', title: '', attendeeCount: 4, startAt: '', endAt: '' });
const restoreSql = ref('');
const kioskRoomId = ref('');
const kioskData = ref(null);
const isAdmin = computed(() => ['admin', 'staff'].includes(session.value?.user?.role));
const statusText = { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธ', cancelled: 'ยกเลิก', checked_in: 'เช็กอินแล้ว', completed: 'เสร็จสิ้น', no_show: 'ไม่มาใช้งาน' };
const unreadCount = computed(() => notifications.value.filter((n) => !n.is_read).length);

function notify(message) { toast.value = message; window.setTimeout(() => { toast.value = ''; }, 2800); }
function requireLogin() { if (session.value) return true; view.value = 'auth'; authMode.value = 'login'; notify('กรุณาเข้าสู่ระบบก่อน'); return false; }
function requireAdmin() { if (isAdmin.value) return true; notify('เฉพาะผู้ดูแลระบบ'); return false; }
function formatDateTime(value) { return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
function toDateTime(date, time) { return date + 'T' + time + ':00'; }
async function login() { loading.value = true; try { const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(loginForm) }); saveSession(data); session.value = data; view.value = 'reserve'; await boot(); if (data.user.forcePasswordChange) notify('กรุณาเปลี่ยนรหัสผ่านในหน้าโปรไฟล์'); } catch (error) { notify(error.message); } finally { loading.value = false; } }
async function register() { loading.value = true; try { const data = await api('/auth/register', { method: 'POST', body: JSON.stringify(registerForm) }); saveSession(data); session.value = data; view.value = 'reserve'; await boot(); } catch (error) { notify(error.message); } finally { loading.value = false; } }
function logout() { clearSession(); session.value = null; view.value = 'dashboard'; }
async function loadDashboard() { Object.assign(dashboard, await api('/dashboard')); }
async function loadMeta() { Object.assign(meta, await api('/rooms/meta')); }
async function loadRooms() { const params = new URLSearchParams({ date: searchForm.date, start: searchForm.start, end: searchForm.end, capacity: searchForm.capacity, branchId: searchForm.branchId, building: searchForm.building, equipment: searchForm.equipment.join(','), q: searchForm.q }); rooms.value = await api('/rooms?' + params); selectedRoom.value = rooms.value[0] || null; recurringForm.roomId = recurringForm.roomId || selectedRoom.value?.id || ''; waitlistForm.roomId = waitlistForm.roomId || selectedRoom.value?.id || ''; }
async function loadBookings() { if (session.value) bookings.value = await api('/bookings'); }
async function loadRecurring() { if (session.value) recurring.value = await api('/recurring'); }
async function loadWaitlist() { if (session.value) waitlist.value = await api('/waitlist'); }
async function loadNotifications() { if (session.value) notifications.value = await api('/notifications'); }
async function loadStats() { if (isAdmin.value) Object.assign(stats, await api('/stats')); }
async function loadSettings() { if (session.value?.user?.role === 'admin') Object.assign(settings, await api('/settings')); }
async function createBooking() { if (!requireLogin() || !selectedRoom.value) return; try { await api('/bookings', { method: 'POST', body: JSON.stringify({ roomId: selectedRoom.value.id, title: bookingForm.title, purpose: bookingForm.purpose, attendeeCount: bookingForm.attendeeCount, startAt: toDateTime(searchForm.date, searchForm.start), endAt: toDateTime(searchForm.date, searchForm.end), requesterPhone: bookingForm.requesterPhone, note: bookingForm.note, equipment: searchForm.equipment.map((id) => ({ id, quantity: 1 })) }) }); notify('ส่งคำขอจองแล้ว'); await Promise.all([loadRooms(), loadBookings(), loadNotifications()]); } catch (error) { notify(error.message); } }
async function createRecurring() { if (!requireLogin()) return; try { await api('/recurring', { method: 'POST', body: JSON.stringify(recurringForm) }); notify('สร้างการจองซ้ำแล้ว'); await Promise.all([loadRecurring(), loadBookings()]); } catch (error) { notify(error.message); } }
async function joinWaitlist() { if (!requireLogin()) return; try { await api('/waitlist', { method: 'POST', body: JSON.stringify(waitlistForm) }); notify('เพิ่ม waitlist แล้ว'); await loadWaitlist(); } catch (error) { notify(error.message); } }
async function saveSettings() { if (!requireAdmin()) return; await api('/settings', { method: 'PATCH', body: JSON.stringify(settings) }); document.documentElement.style.setProperty('--primary', settings.primary_color || '#12805c'); notify('บันทึก Settings แล้ว'); }
async function testEmail() { await api('/settings/test-email', { method: 'POST', body: JSON.stringify({ to: settings.admin_email }) }); notify('ส่งอีเมลทดสอบแล้ว ถ้าตั้งค่า SMTP ถูกต้อง'); }
function downloadBackup() { window.open(API_URL + '/backup/download', '_blank'); }
async function restoreBackup() { if (!restoreSql.value.trim()) return notify('กรุณาวาง SQL backup ก่อน'); await api('/backup/restore', { method: 'POST', body: JSON.stringify({ sql: restoreSql.value }) }); notify('Restore สำเร็จ'); }
async function loadKiosk() { if (!kioskRoomId.value) return; kioskData.value = await api('/kiosk/room/' + kioskRoomId.value); }
async function markRead(item) { await api('/notifications/' + item.id + '/read', { method: 'PATCH' }); item.is_read = 1; }
async function boot() { await Promise.all([loadDashboard(), loadMeta(), loadRooms(), loadBookings(), loadNotifications()]); }
onMounted(() => boot().catch((error) => notify(error.message)));
</script>

<template>
  <main v-if="view === 'kiosk'" class="kiosk">
    <section class="kiosk-board">
      <h1>{{ kioskData?.room?.name || 'Kiosk Mode' }}</h1>
      <label>เลือกห้อง<select v-model="kioskRoomId">
          <option value="">เลือกห้อง</option>
          <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option>
        </select></label>
      <button class="primary" @click="loadKiosk">เปิดหน้าห้อง</button>
      <div v-if="kioskData" class="kiosk-status">{{ kioskData.current ? 'กำลังใช้งาน: ' + kioskData.current.title :
        'ว่างอยู่ตอนนี้' }}</div>
      <p v-if="kioskData?.next">ถัดไป: {{ kioskData.next.title }} เวลา {{ formatDateTime(kioskData.next.start_at) }}</p>
      <button class="ghost" @click="view = 'dashboard'">กลับระบบหลัก</button>
    </section>
  </main>

  <main v-else class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <DoorOpen />MeetPlanning
      </div>
      <button :class="{ active: view === 'dashboard' }" @click="view = 'dashboard'">
        <CalendarDays />หน้าแรก
      </button>
      <button :class="{ active: view === 'reserve' }" @click="view = 'reserve'">
        <Search />ค้นหาห้อง
      </button>
      <button :class="{ active: view === 'recurring' }" @click="requireLogin() && (view = 'recurring', loadRecurring())">
        <Repeat />จองซ้ำ
      </button>
      <button :class="{ active: view === 'waitlist' }" @click="requireLogin() && (view = 'waitlist', loadWaitlist())">
        <Users />Waitlist
      </button>
      <button :class="{ active: view === 'notifications' }"
        @click="requireLogin() && (view = 'notifications', loadNotifications())">
        <Bell />แจ้งเตือน <small v-if="unreadCount">{{ unreadCount }}</small>
      </button>
      <button v-if="isAdmin" :class="{ active: view === 'stats' }" @click="view = 'stats'; loadStats()">
        <FileText />สถิติ
      </button>
      <button v-if="isAdmin" :class="{ active: view === 'backup' }" @click="view = 'backup'">
        <Database />Backup/Restore
      </button>
      <button v-if="isAdmin" :class="{ active: view === 'settings' }" @click="view = 'settings'; loadSettings()">
        <Settings />Settings
      </button>
      <button @click="view = 'kiosk'">
        <DoorOpen />Kiosk
      </button>
      <button v-if="!session" :class="{ active: view === 'auth' }" @click="view = 'auth'; authMode = 'login'">
        <LogIn />เข้าสู่ระบบ
      </button>
      <button v-if="session" class="logout" @click="logout">
        <LogOut />ออกจากระบบ
      </button>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <div>
          <p class="eyebrow">Green White Theme</p>
          <h1>{{ view }}</h1>
        </div>
        <div class="auth-buttons">
          <div v-if="session" class="user-pill">
            <ShieldCheck />{{ session.user.name }} · {{ session.user.role }}
          </div><button v-else class="primary compact" @click="view = 'auth'; authMode = 'register'">
            <UserPlus />สมัครสมาชิก
          </button>
        </div>
      </header>

      <section v-if="view === 'dashboard'" class="dashboard-grid">
        <article class="metric">
          <DoorOpen /><span>ห้องพร้อมใช้</span><strong>{{ dashboard.roomCount }}</strong>
        </article>
        <article class="metric">
          <CalendarDays /><span>จองวันนี้</span><strong>{{ dashboard.todayCount }}</strong>
        </article>
        <article class="metric">
          <Bell /><span>แจ้งเตือนใหม่</span><strong>{{ unreadCount }}</strong>
        </article>
        <div class="panel wide">
          <h2>กำหนดการถัดไป</h2>
          <div v-for="item in dashboard.upcoming" :key="item.id" class="booking-row">
            <div><strong>{{ item.title }}</strong><span>{{ item.room_name }}</span></div><time>{{
              formatDateTime(item.start_at) }}</time><span class="status" :class="item.status">{{
                statusText[item.status] || item.status }}</span>
          </div>
        </div>
      </section>

      <section v-if="view === 'reserve'" class="reserve-grid">
        <form class="panel search-panel" @submit.prevent="loadRooms">
          <h2>ค้นหาห้อง</h2><label>คำค้น<input v-model="searchForm.q" /></label><label>วันที่<input
              v-model="searchForm.date" type="date" /></label>
          <div class="two-cols"><label>เริ่ม<input v-model="searchForm.start" type="time" /></label><label>สิ้นสุด<input
                v-model="searchForm.end" type="time" /></label></div><label>จำนวนคน<input
              v-model.number="searchForm.capacity" type="number" /></label><button class="primary">ค้นหา</button>
        </form>
        <div class="rooms-list">
          <article v-for="room in rooms" :key="room.id" class="room-card" :class="{ selected: selectedRoom?.id === room.id }"
            @click="selectedRoom = room"><img :src="room.image_url" />
            <div>
              <h3>{{ room.name }}</h3>
              <p>{{ room.branch_name }} · {{ room.building }} · {{ room.floor }}</p>
              <div class="tags"><small v-for="eq in room.equipment" :key="eq.id">{{ eq.name }}</small></div>
            </div>
          </article>
        </div>
        <form class="panel booking-form" @submit.prevent="createBooking">
          <h2>จองห้อง</h2>
          <p class="muted">{{ selectedRoom?.name || 'เลือกห้องก่อน' }}</p><label>หัวข้อ<input
              v-model="bookingForm.title" /></label><label>จำนวนคน<input v-model.number="bookingForm.attendeeCount"
              type="number" /></label><label>วัตถุประสงค์<textarea
              v-model="bookingForm.purpose"></textarea></label><button class="primary">ส่งคำขอจอง</button>
        </form>
      </section>

      <section v-if="view === 'recurring'" class="admin-grid">
        <form class="panel form" @submit.prevent="createRecurring">
          <h2>Recurring Booking</h2><label>ห้อง<select v-model="recurringForm.roomId">
              <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option>
            </select></label><label>หัวข้อ<input v-model="recurringForm.title" /></label><label>รูปแบบ<select
              v-model="recurringForm.repeatType">
              <option value="weekly">ทุกสัปดาห์</option>
              <option value="monthly">ทุกเดือน</option>
            </select></label>
          <div class="two-cols"><label>เริ่มวันที่<input v-model="recurringForm.startDate"
                type="date" /></label><label>ถึงวันที่<input v-model="recurringForm.endDate" type="date" /></label>
          </div>
          <div class="two-cols"><label>เวลาเริ่ม<input v-model="recurringForm.startTime"
                type="time" /></label><label>เวลาสิ้นสุด<input v-model="recurringForm.endTime" type="time" /></label>
          </div><button class="primary">สร้างจองซ้ำ</button>
        </form>
        <div class="panel">
          <h2>รายการจองซ้ำ</h2>
          <div v-for="item in recurring" :key="item.id" class="simple-row"><strong>{{ item.title }}</strong><span>{{
            item.room_name }} · {{ item.repeat_type }}</span></div>
        </div>
      </section>
      <section v-if="view === 'waitlist'" class="admin-grid">
        <form class="panel form" @submit.prevent="joinWaitlist">
          <h2>เข้าคิว Waitlist</h2><label>ห้อง<select v-model="waitlistForm.roomId">
              <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option>
            </select></label><label>หัวข้อ<input v-model="waitlistForm.title" /></label><label>เริ่ม<input
              v-model="waitlistForm.startAt" type="datetime-local" /></label><label>สิ้นสุด<input
              v-model="waitlistForm.endAt" type="datetime-local" /></label><button class="primary">เข้าคิว</button>
        </form>
        <div class="panel">
          <h2>Waitlist</h2>
          <div v-for="item in waitlist" :key="item.id" class="simple-row"><strong>{{ item.title }}</strong><span>{{
            item.room_name }} · {{ item.status }}</span></div>
        </div>
      </section>
      <section v-if="view === 'notifications'" class="panel">
        <h2>แจ้งเตือน</h2>
        <div v-for="item in notifications" :key="item.id" class="simple-row" :class="{ unread: !item.is_read }"><strong>{{
          item.title }}</strong><span>{{ item.message }}</span><button class="ghost"
            @click="markRead(item)">อ่านแล้ว</button></div>
      </section>
      <section v-if="view === 'stats'" class="panel">
        <h2>Dashboard เชิงสถิติ</h2>
        <div class="stat-grid">
          <div class="metric" v-for="row in stats.rooms" :key="row.name"><span>{{ row.name }}</span><strong>{{ row.total
              }}</strong></div>
        </div>
        <div class="report-grid">
          <div>
            <h3>รายเดือน</h3>
            <p v-for="row in stats.monthly" :key="row.month">{{ row.month }}: {{ row.total }}</p>
          </div>
          <div>
            <h3>ช่วงเวลา</h3>
            <p v-for="row in stats.hours" :key="row.hour">{{ row.hour }}:00 = {{ row.total }}</p>
          </div>
          <div>
            <h3>สถานะ</h3>
            <p v-for="row in stats.cancelRate" :key="row.status">{{ statusText[row.status] || row.status }}: {{
              row.total }}</p>
          </div>
        </div>
      </section>
      <section v-if="view === 'backup'" class="admin-grid">
        <div class="panel">
          <h2>Backup</h2><button class="primary" @click="downloadBackup">
            <Database />Download SQL Backup
          </button>
        </div>
        <form class="panel form" @submit.prevent="restoreBackup">
          <h2>Restore</h2><textarea v-model="restoreSql" rows="12"
            placeholder="วาง SQL backup ที่นี่"></textarea><button class="primary">Restore</button>
        </form>
      </section>
      <section v-if="view === 'settings'" class="admin-grid">
        <form class="panel form" @submit.prevent="saveSettings">
          <h2>Setting ระบบ</h2><label>ชื่อองค์กร<input v-model="settings.org_name" /></label><label>สีหลัก<input
              v-model="settings.primary_color" type="color" /></label><label>อีเมลผู้ดูแล<input
              v-model="settings.admin_email" /></label><label>SMTP Host<input
              v-model="settings.smtp_host" /></label><label>SMTP Port<input
              v-model="settings.smtp_port" /></label><label>SMTP User<input
              v-model="settings.smtp_user" /></label><label>SMTP Password<input v-model="settings.smtp_password"
              type="password" /></label><button class="primary">บันทึก</button><button type="button" class="ghost"
            @click="testEmail">
            <Mail />ทดสอบอีเมล
          </button>
        </form>
      </section>
      <section v-if="view === 'auth'" class="auth-card panel">
        <form v-if="authMode === 'login'" class="form" @submit.prevent="login">
          <h2>เข้าสู่ระบบ</h2><label>อีเมล<input v-model="loginForm.email" /></label><label>รหัสผ่าน<input
              v-model="loginForm.password" type="password" /></label><button class="primary">เข้าสู่ระบบ</button><button
            type="button" class="ghost full" @click="authMode = 'register'">สมัครสมาชิก</button>
        </form>
        <form v-else class="form" @submit.prevent="register">
          <h2>สมัครสมาชิก</h2><label>ชื่อ<input v-model="registerForm.name" /></label><label>อีเมล<input
              v-model="registerForm.email" /></label><label>รหัสผ่าน<input v-model="registerForm.password"
              type="password" /></label><button class="primary">สมัคร</button>
        </form>
      </section>
    </section>
    <div v-if="toast" class="toast">{{ toast }}</div>
  </main>
</template>
