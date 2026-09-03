import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Trash2, 
  Fingerprint, 
  CreditCard, 
  Key, 
  Shield, 
  X, 
  Check, 
  RefreshCw,
  Building2,
  CalendarClock,
  Edit3,
  CheckSquare,
  Square,
  ArrowUpDown,
  Filter,
  Layers,
  Sparkles
} from 'lucide-react';
import { Employee, ZKTecoDevice, Department, Shift } from '../types';

interface EmployeesViewProps {
  device: ZKTecoDevice;
  employees: Employee[];
  departments?: Department[];
  shifts?: Shift[];
  onAddEmployee: (emp: Employee) => void;
  onDeleteEmployee: (userId: string) => void;
  onUpdateEmployee?: (updated: Employee) => void;
  onBulkAssignDepartment?: (userIds: string[], departmentId: string, departmentName: string) => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  device,
  employees,
  departments = [],
  shifts = [],
  onAddEmployee,
  onDeleteEmployee,
  onUpdateEmployee,
  onBulkAssignDepartment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'dept' | 'shift'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Multi-select for bulk department assignment
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [bulkTargetDeptId, setBulkTargetDeptId] = useState(departments[0]?.id || '1');

  // Single Edit / Assignment Modal
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editDeptId, setEditDeptId] = useState('');
  const [editShiftId, setEditShiftId] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editPrivilege, setEditPrivilege] = useState<number>(0);

  // Add Employee Modal Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const openAddModal = () => {
    // Auto-assign next available Employee ID
    const maxId = employees.reduce((max, e) => {
      const n = parseInt(e.user_id, 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    setUserId(String(maxId + 1));
    setName('');
    setCardNumber('');
    setPassword('');
    setPrivilege(0);
    setAddDeptId(departments[0]?.id || '1');
    setAddShiftId(shifts[0]?.id || 'shift_day_7_19');
    setIsAddModalOpen(true);
  };
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [privilege, setPrivilege] = useState<number>(0);
  const [cardNumber, setCardNumber] = useState('');
  const [password, setPassword] = useState('');
  const [addDeptId, setAddDeptId] = useState(departments[0]?.id || '1');
  const [addShiftId, setAddShiftId] = useState(shifts[0]?.id || 'shift_day_7_19');

  const deptMap = new Map<string, Department>();
  departments.forEach((d) => deptMap.set(String(d.id), d));

  // Filter and Sort employees
  const filteredEmployees = employees
    .filter((emp) => {
      // Department Filter
      if (selectedDeptFilter !== 'all' && String(emp.department_id) !== selectedDeptFilter) {
        return false;
      }
      // Search query
      const q = searchQuery.toLowerCase();
      const deptName = deptMap.get(String(emp.department_id))?.name || emp.department_name || '';
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.user_id.toLowerCase().includes(q) ||
        emp.card_number.toLowerCase().includes(q) ||
        deptName.toLowerCase().includes(q) ||
        (emp.designation_title || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let comp = 0;
      if (sortBy === 'id') {
        comp = parseInt(a.user_id, 10) - parseInt(b.user_id, 10);
      } else if (sortBy === 'name') {
        comp = a.name.localeCompare(b.name);
      } else if (sortBy === 'dept') {
        const dA = deptMap.get(String(a.department_id))?.name || a.department_name || '';
        const dB = deptMap.get(String(b.department_id))?.name || b.department_name || '';
        comp = dA.localeCompare(dB);
      } else if (sortBy === 'shift') {
        comp = (a.shift_id || '').localeCompare(b.shift_id || '');
      }
      return sortOrder === 'asc' ? comp : -comp;
    });

  // Toggle selection
  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredEmployees.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredEmployees.map((e) => e.user_id)));
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditDeptId(String(emp.department_id || '1'));
    setEditShiftId(emp.shift_id || 'shift_day_7_19');
    setEditDesignation(emp.designation_title || '');
    setEditPrivilege(emp.privilege);
  };

  // Save Edit Assignment
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    const targetDept = deptMap.get(String(editDeptId));
    let privName = 'User';
    if (editPrivilege === 14) privName = 'Super Admin';
    else if (editPrivilege === 6) privName = 'Manager';
    else if (editPrivilege === 2) privName = 'Enroller';

    const updated: Employee = {
      ...editingEmployee,
      department_id: editDeptId,
      department_name: targetDept?.name || editingEmployee.department_name,
      shift_id: editShiftId,
      designation_title: editDesignation,
      privilege: editPrivilege,
      privilege_name: privName,
    };

    if (onUpdateEmployee) {
      onUpdateEmployee(updated);
    }
    setEditingEmployee(null);
  };

  // Bulk Assign Handler
  const handleBulkAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetDept = deptMap.get(String(bulkTargetDeptId));
    const deptName = targetDept?.name || 'Plaza Operations';

    if (onBulkAssignDepartment) {
      onBulkAssignDepartment(Array.from(selectedUserIds), bulkTargetDeptId, deptName);
    } else if (onUpdateEmployee) {
      selectedUserIds.forEach((uid) => {
        const emp = employees.find((e) => e.user_id === uid);
        if (emp) {
          onUpdateEmployee({
            ...emp,
            department_id: bulkTargetDeptId,
            department_name: deptName,
          });
        }
      });
    }

    setSelectedUserIds(new Set());
    setIsBulkAssignModalOpen(false);
  };

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !name) return;

    let privName = 'User';
    if (privilege === 14) privName = 'Super Admin';
    else if (privilege === 6) privName = 'Manager';
    else if (privilege === 2) privName = 'Enroller';

    const targetDept = deptMap.get(String(addDeptId));

    const newEmp: Employee = {
      uid: parseInt(userId, 10) || employees.length + 1,
      user_id: userId,
      name: name,
      privilege: privilege,
      privilege_name: privName,
      password: password || undefined,
      card_number: cardNumber || 'None',
      enabled: true,
      has_fingerprint: true,
      department_id: addDeptId,
      department_name: targetDept?.name || 'Plaza Operations',
      shift_id: addShiftId,
      designation_title: 'Toll Operations Staff',
    };

    onAddEmployee(newEmp);
    setIsAddModalOpen(false);
    setUserId('');
    setName('');
    setCardNumber('');
    setPassword('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121212] p-6 rounded-2xl border border-[#262626] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-blue-400" />
            <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">
              Employee & Department Directory
            </h1>
          </div>
          <p className="text-sm text-neutral-400">
            Department-wise roster sorting & assignment &bull; Enrolled biometric users on ZKTeco K40 hardware
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
            {/* Delete Inactive Employees */}
            {employees.filter(e => !e.enabled).length > 0 && (
              <button
                onClick={() => {
                  const inactive = employees.filter(e => !e.enabled);
                  if (window.confirm(`Permanently delete ${inactive.length} inactive/disabled employee(s) from K40 terminal memory?`)) {
                    inactive.forEach(e => onDeleteEmployee(e.user_id));
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                title="Remove all disabled/inactive employees from K40 terminal"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Inactive ({employees.filter(e => !e.enabled).length})</span>
              </button>
            )}
          {selectedUserIds.size > 0 && (
            <button
              onClick={() => setIsBulkAssignModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-purple-900/30 transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>Bulk Assign Dept ({selectedUserIds.size})</span>
            </button>
          )}

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-blue-900/30 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll New Employee</span>
          </button>
        </div>
      </div>

      {/* Filter and Sorting Controls */}
      <div className="bg-[#121212] p-5 rounded-2xl border border-[#262626] shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Box */}
          <div className="relative">
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Search Roster</label>
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Name, ID, Card, or Dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#181818] border border-[#2e2e2e] rounded-xl text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
              Filter by Department
            </label>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#181818] border border-[#2e2e2e] rounded-xl text-xs text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">🏢 All Departments ({employees.length} Staff)</option>
              {departments.map((dept) => {
                const count = employees.filter((e) => String(e.department_id) === String(dept.id)).length;
                return (
                  <option key={dept.id} value={String(dept.id)}>
                    DEPT-{dept.id}: {dept.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Sort By Field */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-[#181818] border border-[#2e2e2e] rounded-xl text-xs text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="id">Employee ID (Numeric)</option>
              <option value="name">Full Name (Alphabetical)</option>
              <option value="dept">Department Name</option>
              <option value="shift">Assigned Duty Shift</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
              Sort Order
            </label>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="w-full px-3 py-2 bg-[#181818] hover:bg-[#202020] border border-[#2e2e2e] rounded-xl text-xs font-semibold text-neutral-200 flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>{sortOrder === 'asc' ? 'Ascending (A → Z, 1 → 9)' : 'Descending (Z → A, 9 → 1)'}</span>
              <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Selection summary */}
        <div className="flex items-center justify-between pt-3 border-t border-[#222222] text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#181818] hover:bg-[#202020] text-neutral-300 font-medium border border-[#2a2a2a] transition-colors cursor-pointer"
            >
              {selectedUserIds.size === filteredEmployees.length && filteredEmployees.length > 0 ? (
                <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <Square className="w-3.5 h-3.5 text-neutral-500" />
              )}
              <span>Select All Visible ({filteredEmployees.length})</span>
            </button>

            {selectedUserIds.size > 0 && (
              <span className="text-purple-400 font-semibold">
                {selectedUserIds.size} employees selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span>Showing: <strong className="text-neutral-100">{filteredEmployees.length}</strong> of {employees.length}</span>
            <span className="text-[#333333]">|</span>
            <span>Source: <strong className="text-emerald-400">K40 Terminal Memory</strong></span>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-[#121212] rounded-2xl border border-[#262626] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#181818] text-neutral-400 font-semibold border-b border-[#262626]">
              <tr>
                <th className="py-3.5 px-4 w-8"></th>
                <th className="py-3.5 px-4">UID</th>
                <th className="py-3.5 px-4">Employee ID</th>
                <th className="py-3.5 px-4">Full Name & Designation</th>
                <th className="py-3.5 px-4">Assigned Department</th>
                <th className="py-3.5 px-4">Duty Shift</th>
                <th className="py-3.5 px-4">Privilege</th>
                <th className="py-3.5 px-4">RFID Card</th>
                <th className="py-3.5 px-4">Biometrics</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f] font-medium">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-neutral-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No employees found matching your filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedUserIds.has(emp.user_id);
                  const isSuperAdmin = emp.privilege === 14;
                  const isManager = emp.privilege === 6;
                  const dept = deptMap.get(String(emp.department_id));
                  const shift = shifts.find((s) => s.id === emp.shift_id);

                  const shiftBadge = emp.shift_id === 'shift_night_19_7' 
                    ? { label: 'Night 19-7', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' }
                    : emp.shift_id === 'shift_office_830_1630'
                    ? { label: 'Office 8:30-16:30', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
                    : { label: 'Daytime 7-19', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };

                  return (
                    <tr 
                      key={emp.user_id} 
                      className={`hover:bg-[#181818]/80 transition-colors ${
                        isSelected ? 'bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => toggleSelectUser(emp.user_id)}
                          className="text-neutral-500 hover:text-neutral-300 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-600" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-500">{emp.uid}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-200">EMP-{emp.user_id}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-blue-400 text-xs">{emp.name}</div>
                        <div className="text-[11px] text-neutral-400">{emp.designation_title || 'Toll Staff'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-neutral-200 text-xs">
                          {dept?.name || emp.department_name || 'Plaza Operations'}
                        </div>
                        <div className="text-[10px] font-mono text-neutral-500">DEPT-{emp.department_id || '1'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${shiftBadge.color}`}>
                          {shiftBadge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isSuperAdmin
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : isManager
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-[#1c1c1c] text-neutral-300 border border-[#2c2c2c]'
                          }`}
                        >
                          {emp.privilege_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-400">
                        {emp.card_number && emp.card_number !== 'None' ? (
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
                            {emp.card_number}
                          </span>
                        ) : (
                          <span className="text-neutral-600">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[10px]">
                          <Fingerprint className="w-3.5 h-3.5" />
                          Registered
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                            title="Assign Department & Shift"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Permanently delete ${emp.name} (EMP-${emp.user_id}) from ZKTeco K40 hardware memory?`)) {
                                onDeleteEmployee(emp.user_id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete from K40 Terminal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT / ASSIGN DEPARTMENT & SHIFT                                 */}
      {/* ========================================================================= */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#121212] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#2c2c2c] text-neutral-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#222222] mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-neutral-100 text-base">
                  Assign Department & Shift
                </h3>
              </div>
              <button
                onClick={() => setEditingEmployee(null)}
                className="text-neutral-400 hover:text-neutral-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-[#181818] rounded-xl border border-[#262626] flex items-center justify-between">
              <div>
                <p className="font-bold text-neutral-100 text-sm">{editingEmployee.name}</p>
                <p className="text-xs font-mono text-neutral-400">Employee ID: EMP-{editingEmployee.user_id}</p>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono">
                UID: {editingEmployee.uid}
              </span>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Assign Department <span className="text-rose-400">*</span>
                </label>
                <select
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-xs text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      DEPT-{d.id}: {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Duty Shift (Default SchClass)
                </label>
                <select
                  value={editShiftId}
                  onChange={(e) => setEditShiftId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-xs text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.is_night_shift ? '🌙 ' : '☀️ '} {s.name} ({s.start_time} - {s.end_time})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-neutral-500 mt-1 block">
                  Note: Auto Shift Rotation will automatically adapt if staff punches on a different shift!
                </span>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Designation / Role Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Toll Collector"
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Terminal Privilege Level
                </label>
                <select
                  value={editPrivilege}
                  onChange={(e) => setEditPrivilege(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-xs text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value={0}>Normal User</option>
                  <option value={2}>Enroller</option>
                  <option value={6}>Manager</option>
                  <option value={14}>Super Admin</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 text-neutral-400 hover:text-neutral-200 hover:bg-[#1c1c1c] font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md shadow-blue-900/30 transition-all cursor-pointer"
                >
                  Save Department Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BULK ASSIGN DEPARTMENT                                           */}
      {/* ========================================================================= */}
      {isBulkAssignModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#121212] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#2c2c2c] text-neutral-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#222222] mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-neutral-100 text-base">
                  Bulk Assign Department ({selectedUserIds.size} Staff)
                </h3>
              </div>
              <button
                onClick={() => setIsBulkAssignModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkAssignSubmit} className="space-y-4 text-xs">
              <p className="text-neutral-300">
                You are about to reassign <strong>{selectedUserIds.size}</strong> employees to a new department:
              </p>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  Select Target Department
                </label>
                <select
                  value={bulkTargetDeptId}
                  onChange={(e) => setBulkTargetDeptId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-xs text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      DEPT-{d.id}: {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={() => setIsBulkAssignModalOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-neutral-200 hover:bg-[#1c1c1c] font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl shadow-md shadow-purple-900/30 transition-all cursor-pointer"
                >
                  Apply to {selectedUserIds.size} Employees
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ENROLL NEW EMPLOYEE                                              */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#121212] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#2c2c2c] text-neutral-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#222222] mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-neutral-100 text-lg">Enroll Staff to K40</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Employee ID (Numeric on Terminal) <span className="text-rose-400">*</span>
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1005"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#171717] border border-blue-500/40 rounded-xl text-sm font-mono font-bold text-blue-300 placeholder:text-neutral-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <span className="text-[10px] text-emerald-400 whitespace-nowrap font-semibold">Auto-assigned ✓</span>
                </div>
                <p className="text-[10px] text-neutral-500 mt-0.5">Next available ID from machine. Edit if needed.</p>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={24}
                  placeholder="e.g. Tariq Mahmoud"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Department</label>
                  <select
                    value={addDeptId}
                    onChange={(e) => setAddDeptId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#171717] border border-[#2c2c2c] rounded-xl text-xs text-neutral-100 focus:outline-hidden"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={String(d.id)}>
                        DEPT-{d.id}: {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Duty Shift</label>
                  <select
                    value={addShiftId}
                    onChange={(e) => setAddShiftId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#171717] border border-[#2c2c2c] rounded-xl text-xs text-neutral-100 focus:outline-hidden"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Privilege Level</label>
                  <select
                    value={privilege}
                    onChange={(e) => setPrivilege(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#171717] border border-[#2c2c2c] rounded-xl text-xs text-neutral-100 focus:outline-hidden"
                  >
                    <option value={0}>Normal User</option>
                    <option value={2}>Enroller</option>
                    <option value={6}>Manager</option>
                    <option value={14}>Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">RFID Card No.</label>
                  <input
                    type="text"
                    placeholder="0"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Device PIN Password (Optional)</label>
                <input
                  type="password"
                  maxLength={8}
                  placeholder="Max 8 digits"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden"
                />
              </div>

              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-300 text-[11px] leading-relaxed">
                <div className="flex items-start gap-2">
                  <Fingerprint className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-300 mb-0.5">Fingerprint Enrollment</p>
                    <p>Employee will be written to K40 hardware memory. To register fingerprint templates, proceed to the physical ZKTeco terminal → <span className="font-mono text-blue-200">Menu → User Mgt → New User → Fingerprint</span>. Up to 10 FP templates per user (fingers).</p>
                    <p className="mt-1 text-[10px] text-blue-200/60">Verification: Fingerprint &bull; RFID Card &bull; PIN Password</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-neutral-200 hover:bg-[#1c1c1c] font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md shadow-blue-900/30 transition-all cursor-pointer"
                >
                  Save to K40 Terminal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
