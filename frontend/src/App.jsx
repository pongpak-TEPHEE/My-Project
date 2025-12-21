import React, { useState, useEffect } from 'react';
import { Home, Calendar, QrCode, Bell, FileText, Users, CheckCircle, Clock, Upload, Search } from 'lucide-react';

// --- Sidebar Component ---
const Sidebar = ({ activeMenu, setActiveMenu }) => {
  const menus = [
    { id: 'dashboard', icon: <Home size={20} />, label: 'Dashboard' },
    { id: 'rooms', icon: <Users size={20} />, label: 'Rooms & Status' },
    { id: 'schedule', icon: <Calendar size={20} />, label: 'Class Schedule' },
    { id: 'qr', icon: <QrCode size={20} />, label: 'QR Scanner' },
  ];

  return (
    <aside className="w-64 bg-[#2E1A47] text-white flex flex-col h-screen fixed left-0 top-0 shadow-2xl z-50">
      <div className="p-8 text-center border-b border-purple-800">
        <h1 className="text-3xl font-bold text-yellow-400">SCI KU</h1>
        <p className="text-sm text-purple-200 tracking-wider">SRC CAMPUS</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 mt-4">
        {menus.map((menu) => (
          <button
            key={menu.id}
            onClick={() => setActiveMenu(menu.id)}
            className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 ${
              activeMenu === menu.id 
                ? 'bg-yellow-500 text-purple-900 font-bold shadow-lg transform scale-105' 
                : 'text-gray-300 hover:bg-purple-800 hover:text-white'
            }`}
          >
            {menu.icon}
            <span>{menu.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 m-4 bg-purple-900/50 rounded-xl border border-purple-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-purple-900 font-bold text-lg">
            A
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Admin Staff</p>
            <p className="text-xs text-purple-300">Logout</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

// --- Dashboard View ---
const DashboardView = () => {
  const stats = [
    { title: 'จำนวนห้องทั้งหมด', value: '4', icon: <Home className="text-white" />, color: 'bg-yellow-500' },
    { title: 'รอการอนุมัติ', value: '2', icon: <Clock className="text-white" />, color: 'bg-yellow-600' },
    { title: 'อนุมัติแล้ววันนี้', value: '1', icon: <CheckCircle className="text-white" />, color: 'bg-green-500' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <h2 className="text-3xl font-bold text-gray-800">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-gray-500 font-medium">{stat.title}</p>
              <h3 className="text-4xl font-bold text-gray-800 mt-2">{stat.value}</h3>
            </div>
            <div className={`p-4 rounded-xl ${stat.color} shadow-lg`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-purple-900"/> 
            จัดการตารางเรียน (Upload Schedule)
          </h3>
        </div>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center bg-gray-50 hover:bg-purple-50 hover:border-purple-300 transition-colors cursor-pointer group">
          <div className="bg-white p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
            <Upload className="text-purple-900" size={32} />
          </div>
          <p className="text-gray-600 font-medium">ลากไฟล์ .xlsx หรือ .csv ลงที่นี่</p>
          <p className="text-sm text-gray-400 mt-2">เพื่ออัปเดตตารางเรียนประจำภาคการศึกษา</p>
        </div>
      </div>
    </div>
  );
};

// --- Rooms View ---
const RoomsView = () => {
  // ข้อมูลจำลอง (Mock Data)
  const rooms = [
    { id: "26504", name: "Computer Lab 1", floor: 5, capacity: 60, status: "Available" },
    { id: "26507", name: "Computer Lab 2", floor: 5, capacity: 60, status: "Busy" },
    { id: "26304", name: "Lecture Room 1", floor: 3, capacity: 50, "status": "Available" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
       <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Room Status</h2>
        <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20}/>
            <input type="text" placeholder="ค้นหาห้อง..." className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <div key={room.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="h-2 bg-yellow-400"></div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xl font-bold text-[#2E1A47]">{room.name}</h4>
                  <p className="text-sm text-gray-500">ID: {room.id} • Floor {room.floor}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  room.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {room.status}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-6">
                <Users size={16} />
                <span>Capacity: {room.capacity} seats</span>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 py-2.5 px-4 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors text-sm">
                  รายละเอียด
                </button>
                <button 
                  className="flex-1 py-2.5 px-4 rounded-lg bg-[#2E1A47] text-white font-medium hover:bg-purple-900 transition-colors text-sm shadow-md shadow-purple-200"
                  onClick={() => alert(`ขอจองห้อง ${room.name}`)}
                >
                  จองห้อง
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Main App ---
function App() {
  const [activeMenu, setActiveMenu] = useState('dashboard');

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans">
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      
      <main className="flex-1 ml-64 p-8 transition-all duration-300">
        <header className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">ยินดีต้อนรับ, Pongpak</h1>
                <p className="text-gray-500">วันนี้วันพุธที่ 20 ธันวาคม 2568</p>
            </div>
            <div className="flex gap-4">
                 <button className="p-2 bg-white rounded-full shadow-sm text-gray-600 hover:text-purple-900 relative">
                    <Bell size={24}/>
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                 </button>
            </div>
        </header>
        
        {activeMenu === 'dashboard' && <DashboardView />}
        {activeMenu === 'rooms' && <RoomsView />}
        {activeMenu === 'schedule' && <div className="text-center text-gray-500 mt-20 text-xl">หน้านี้สำหรับใส่ FullCalendar</div>}
        {activeMenu === 'qr' && <div className="text-center text-gray-500 mt-20 text-xl">หน้านี้สำหรับ QR Code Scanner logic</div>}
      
      </main>
    </div>
  );
}

export default App;