import React, { useState } from 'react';
import { StaffAccount, UserRole, AuthUser } from '../../types';
import { StorageService } from '../../utils/storage';
import { ApiService } from '../../utils/api';
import { sounds } from '../../utils/audio';
import {
  Users,
  Plus,
  KeyRound,
  ShieldCheck,
  Bike,
  CreditCard,
  ChefHat,
  Search,
  Filter,
  Copy,
  Check,
  Edit2,
  Trash2,
  ExternalLink,
  MessageCircle,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Unlock,
  AlertCircle,
  X,
  Phone,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';

interface StaffAccountsManagerTabProps {
  onSwitchPortal?: (view: 'admin' | 'kitchen' | 'pos' | 'rider') => void;
}

export const StaffAccountsManagerTab: React.FC<StaffAccountsManagerTabProps> = ({
  onSwitchPortal,
}) => {
  const [accounts, setAccounts] = useState<StaffAccount[]>(() => StorageService.getStaffAccounts());
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCredsId, setCopiedCredsId] = useState<string | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<StaffAccount | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states for creation
  const [formRole, setFormRole] = useState<UserRole>('employee');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStation, setFormStation] = useState('');
  const [formShowPassword, setFormShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refreshAccounts = () => {
    setAccounts(StorageService.getStaffAccounts());
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleGeneratePassword = () => {
    const rolesPrefix: Record<UserRole, string> = {
      employee: 'Kitchen',
      kitchen: 'Chef',
      pos: 'Cashier',
      rider: 'Rider',
      admin: 'Manager',
    };
    const prefix = rolesPrefix[formRole] || 'Staff';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const specialChars = ['#', '!', '$', '@'];
    const char = specialChars[Math.floor(Math.random() * specialChars.length)];
    const generated = `BiteGo${char}${prefix}${randNum}`;
    setFormPassword(generated);
    setFormShowPassword(true);
  };

  const handleOpenCreateModal = (presetRole?: UserRole) => {
    setFormRole(presetRole || 'employee');
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormStation('');
    setFormError('');
    setFormShowPassword(false);

    // Auto-generate starting credentials
    const rolesPrefix: Record<UserRole, string> = {
      employee: 'kitchen.staff',
      kitchen: 'chef',
      pos: 'pos.cashier',
      rider: 'rider',
      admin: 'assistant.admin',
    };
    const p = rolesPrefix[presetRole || 'employee'] || 'staff';
    const rand = Math.floor(10 + Math.random() * 90);
    setFormEmail(`${p}${rand}@biteandgo.pk`);

    const randNum = Math.floor(1000 + Math.random() * 9000);
    setFormPassword(`BiteGo#${randNum}`);

    setIsCreateModalOpen(true);
  };

  const handleCreateAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      setFormError('Please enter a name, email, and password.');
      return;
    }

    try {
      const created = StorageService.createStaffAccount({
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
        password: formPassword.trim(),
        phone: formPhone.trim() || undefined,
        assignedStation: formStation.trim() || undefined,
        isActive: true,
      });

      ApiService.syncStaffAccount({
        email: created.email,
        password: formPassword.trim(),
        name: created.name,
        role: created.role,
        station: created.assignedStation,
      }).catch(() => {});

      refreshAccounts();
      setIsCreateModalOpen(false);
      showToast(`Staff account "${created.name}" created successfully! Credentials active.`);
      sounds.playSuccess();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create staff account.');
    }
  };

  const handleUpdateAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    try {
      StorageService.updateStaffAccount(editingAccount.id, {
        name: editingAccount.name.trim(),
        email: editingAccount.email.trim(),
        role: editingAccount.role,
        password: editingAccount.password ? editingAccount.password.trim() : undefined,
        phone: editingAccount.phone ? editingAccount.phone.trim() : undefined,
        assignedStation: editingAccount.assignedStation ? editingAccount.assignedStation.trim() : undefined,
      });

      ApiService.syncStaffAccount({
        email: editingAccount.email.trim(),
        password: editingAccount.password ? editingAccount.password.trim() : undefined,
        name: editingAccount.name.trim(),
        role: editingAccount.role,
        station: editingAccount.assignedStation ? editingAccount.assignedStation.trim() : undefined,
      }).catch(() => {});

      refreshAccounts();
      setEditingAccount(null);
      showToast(`Account "${editingAccount.name}" updated successfully.`);
      sounds.playSuccess();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update account.');
    }
  };

  const handleToggleActive = (acc: StaffAccount) => {
    StorageService.updateStaffAccount(acc.id, { isActive: !acc.isActive });
    refreshAccounts();
    showToast(`Account "${acc.name}" is now ${!acc.isActive ? 'Active' : 'Deactivated'}.`);
  };

  const handleDeleteAccount = (id: string) => {
    try {
      const target = accounts.find((a) => a.id === id);
      StorageService.deleteStaffAccount(id);
      if (target?.email) {
        ApiService.deleteStaffAccount(target.email).catch(() => {});
      }
      refreshAccounts();
      setDeleteConfirmId(null);
      showToast('Staff account deleted.');
    } catch (err: any) {
      showToast(err.message || 'Could not delete account.');
    }
  };

  const handleCopyCredentials = (acc: StaffAccount) => {
    const text = [
      `🍔 *BITE & GO EXPRESS — STAFF CREDENTIALS*`,
      `👤 *Staff Name:* ${acc.name}`,
      `🔑 *Role / Portal:* ${acc.role.toUpperCase()}`,
      `📧 *Login Email:* ${acc.email}`,
      `🔒 *Password:* ${acc.password || 'Contact manager'}`,
      acc.assignedStation ? `🏢 *Station:* ${acc.assignedStation}` : '',
      ``,
      `🌐 *Portal Login:* Sign in at https://biteandgo.pk/admin or click Staff Login on website.`,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopiedCredsId(acc.id);
    setTimeout(() => setCopiedCredsId(null), 2500);
    showToast(`Credentials copied! You can now paste and send to ${acc.name} on WhatsApp.`);
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const matchesRole =
      selectedRoleFilter === 'all'
        ? true
        : selectedRoleFilter === 'kitchen'
        ? acc.role === 'kitchen' || acc.role === 'employee'
        : acc.role === selectedRoleFilter;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      acc.name.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q) ||
      (acc.assignedStation || '').toLowerCase().includes(q) ||
      (acc.phone || '').includes(q);

    return matchesRole && matchesSearch;
  });

  const roleBadges: Record<UserRole, { label: string; icon: any; color: string }> = {
    employee: { label: 'Kitchen / Chef', icon: ChefHat, color: 'bg-red-500/15 text-red-400 border-red-500/30' },
    kitchen: { label: 'Kitchen / Chef', icon: ChefHat, color: 'bg-red-500/15 text-red-400 border-red-500/30' },
    pos: { label: 'POS System Cashier', icon: CreditCard, color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    rider: { label: 'Delivery Rider HUD', icon: Bike, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    admin: { label: 'Store Manager / Admin', icon: ShieldCheck, color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/20 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Staff Accounts &amp; Portal Logins
              </h2>
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                Manager HUD Access
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Create and manage email &amp; password credentials for Kitchen Employees, POS Cashiers, and Delivery Riders.
            </p>
          </div>
        </div>

        {/* Quick Create Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenCreateModal('rider')}
            className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Bike className="w-3.5 h-3.5" />
            <span>+ Add Rider</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreateModal('pos')}
            className="px-3 py-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>+ Add POS Cashier</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreateModal('employee')}
            className="px-3 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>+ Add Employee</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Staff Account</span>
          </button>
        </div>
      </div>

      {/* Role Counts Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setSelectedRoleFilter('employee')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedRoleFilter === 'employee' || selectedRoleFilter === 'kitchen'
              ? 'bg-red-500/10 border-red-500/50 shadow-md shadow-red-500/5'
              : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1.5">
              <ChefHat className="w-3.5 h-3.5 text-red-400" /> Kitchen Staff
            </span>
            <span className="text-sm font-bold font-mono text-white">
              {accounts.filter((a) => a.role === 'kitchen' || a.role === 'employee').length}
            </span>
          </div>
          <p className="text-[10px] text-neutral-500">Grill, Fryer &amp; KDS Display</p>
        </div>

        <div
          onClick={() => setSelectedRoleFilter('pos')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedRoleFilter === 'pos'
              ? 'bg-blue-500/10 border-blue-500/50 shadow-md shadow-blue-500/5'
              : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-400" /> POS Cashiers
            </span>
            <span className="text-sm font-bold font-mono text-white">
              {accounts.filter((a) => a.role === 'pos').length}
            </span>
          </div>
          <p className="text-[10px] text-neutral-500">Counter Registers &amp; Billing</p>
        </div>

        <div
          onClick={() => setSelectedRoleFilter('rider')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedRoleFilter === 'rider'
              ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/5'
              : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1.5">
              <Bike className="w-3.5 h-3.5 text-emerald-400" /> Delivery Riders
            </span>
            <span className="text-sm font-bold font-mono text-white">
              {accounts.filter((a) => a.role === 'rider').length}
            </span>
          </div>
          <p className="text-[10px] text-neutral-500">Rider Delivery HUD &amp; Maps</p>
        </div>

        <div
          onClick={() => setSelectedRoleFilter('admin')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            selectedRoleFilter === 'admin'
              ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/5'
              : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Managers
            </span>
            <span className="text-sm font-bold font-mono text-white">
              {accounts.filter((a) => a.role === 'admin').length}
            </span>
          </div>
          <p className="text-[10px] text-neutral-500">Full Store Management</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff name, email, or station..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Staff' },
            { id: 'kitchen', label: 'Kitchen' },
            { id: 'pos', label: 'POS Cashiers' },
            { id: 'rider', label: 'Riders' },
            { id: 'admin', label: 'Admins' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedRoleFilter === tab.id
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredAccounts.map((acc) => {
          const badge = roleBadges[acc.role] || roleBadges.employee;
          const RoleIcon = badge.icon;
          const isCopiedEmail = copiedId === acc.id;
          const isCopiedCreds = copiedCredsId === acc.id;

          return (
            <div
              key={acc.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                acc.isActive
                  ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 shadow-md'
                  : 'bg-neutral-950 border-neutral-850 opacity-60'
              }`}
            >
              {/* Card Top */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white shrink-0">
                    <RoleIcon className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm">{acc.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    {acc.assignedStation && (
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        📍 {acc.assignedStation}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(acc)}
                    title={acc.isActive ? 'Deactivate account' : 'Activate account'}
                    className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                      acc.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-neutral-800 text-neutral-500 border-neutral-700 hover:bg-neutral-700'
                    }`}
                  >
                    {acc.isActive ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingAccount(acc)}
                    title="Edit account details or change password"
                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {acc.email !== 'admin@biteandgo.pk' && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(acc.id)}
                      title="Delete staff account"
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Login Credentials Box */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400">Email:</span>
                  <div className="flex items-center gap-1.5">
                    <code className="font-mono text-white select-all font-semibold">{acc.email}</code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(acc.email);
                        setCopiedId(acc.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="text-neutral-500 hover:text-amber-400"
                      title="Copy Email"
                    >
                      {isCopiedEmail ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400">Password:</span>
                  <div className="flex items-center gap-1.5">
                    <code className="font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 select-all font-bold">
                      {acc.password || '••••••••'}
                    </code>
                  </div>
                </div>

                {acc.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-neutral-400">Phone:</span>
                    <span className="font-mono text-neutral-300">{acc.phone}</span>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="mt-3 pt-2.5 border-t border-neutral-850 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyCredentials(acc)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isCopiedCreds
                      ? 'bg-emerald-500 text-neutral-950 shadow-md font-black'
                      : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700'
                  }`}
                  title="Copy formatted login message to send to staff via WhatsApp"
                >
                  {isCopiedCreds ? <Check className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{isCopiedCreds ? 'Credentials Copied!' : 'Copy for WhatsApp'}</span>
                </button>

                {onSwitchPortal && (
                  <button
                    type="button"
                    onClick={() => {
                      if (acc.role === 'pos') onSwitchPortal('pos');
                      else if (acc.role === 'rider') onSwitchPortal('rider');
                      else if (acc.role === 'kitchen' || acc.role === 'employee') onSwitchPortal('kitchen');
                      else onSwitchPortal('admin');
                    }}
                    className="px-2.5 py-1.5 text-neutral-400 hover:text-white text-xs font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>Launch Portal</span>
                    <ExternalLink className="w-3 h-3 text-cyan-400" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE STAFF ACCOUNT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-neutral-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Create Staff Login Account</h3>
                  <p className="text-[11px] text-neutral-400">Generate credentials for employee, POS, or rider</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAccountSubmit} className="space-y-3.5">
              {/* Role Selection */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                  Select Staff Role *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormRole('employee');
                      setFormEmail(`kitchen${Math.floor(10 + Math.random() * 90)}@biteandgo.pk`);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formRole === 'employee' || formRole === 'kitchen'
                        ? 'bg-red-500/15 border-red-500 text-white font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <ChefHat className="w-4 h-4 text-red-400" />
                      <span>Kitchen Employee</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormRole('pos');
                      setFormEmail(`pos${Math.floor(10 + Math.random() * 90)}@biteandgo.pk`);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formRole === 'pos'
                        ? 'bg-blue-500/15 border-blue-500 text-white font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <CreditCard className="w-4 h-4 text-blue-400" />
                      <span>POS Cashier</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormRole('rider');
                      setFormEmail(`rider${Math.floor(10 + Math.random() * 90)}@biteandgo.pk`);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formRole === 'rider'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <Bike className="w-4 h-4 text-emerald-400" />
                      <span>Delivery Rider HUD</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormRole('admin');
                      setFormEmail(`manager${Math.floor(10 + Math.random() * 90)}@biteandgo.pk`);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formRole === 'admin'
                        ? 'bg-amber-500/15 border-amber-500 text-white font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>Store Admin</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Full Name / Identifier *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Farhan Ali (Line Cashier) or Rizwan (Rider #14)"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Login Email *
                </label>
                <input
                  type="email"
                  placeholder="e.g. rider.rizwan@biteandgo.pk"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
              </div>

              {/* Password with Auto-Generate */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-neutral-300">
                    Login Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={formShowPassword ? 'text' : 'password'}
                    placeholder="Enter password (min 6 chars)"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-3 pr-10 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setFormShowPassword(!formShowPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                  >
                    {formShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Station & Phone */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Station / Bike Plate
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Register 02 / KHI-789"
                    value={formStation}
                    onChange={(e) => setFormStation(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Phone (WhatsApp)
                  </label>
                  <input
                    type="text"
                    placeholder="0300-1234567"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Create Staff Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STAFF ACCOUNT MODAL */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-neutral-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Edit Staff Account: {editingAccount.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateAccountSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingAccount.name}
                  onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Login Email</label>
                <input
                  type="email"
                  value={editingAccount.email}
                  onChange={(e) => setEditingAccount({ ...editingAccount, email: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Password</label>
                <input
                  type="text"
                  value={editingAccount.password || ''}
                  onChange={(e) => setEditingAccount({ ...editingAccount, password: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">Station / Plate</label>
                  <input
                    type="text"
                    value={editingAccount.assignedStation || ''}
                    onChange={(e) => setEditingAccount({ ...editingAccount, assignedStation: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingAccount.phone || ''}
                    onChange={(e) => setEditingAccount({ ...editingAccount, phone: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-white text-sm">Delete Staff Account?</h4>
            <p className="text-xs text-neutral-400">
              This staff member will no longer be able to log into their portal with these credentials.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAccount(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
