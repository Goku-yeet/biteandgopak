import React, { useState } from 'react';
import {
  Bike,
  Plus,
  Phone,
  PhoneCall,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  UserCheck,
  UserX,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { DeliveryRider, StoreSettings } from '../../types';
import { StorageService } from '../../utils/storage';
import { ApiService } from '../../utils/api';
import { sounds } from '../../utils/audio';

interface DeliveryRidersManagementSectionProps {
  settings: StoreSettings;
  onSave?: (updated: StoreSettings) => Promise<void> | void;
  onRefreshData?: () => void;
}

export const DeliveryRidersManagementSection: React.FC<DeliveryRidersManagementSectionProps> = ({
  settings,
  onSave,
  onRefreshData,
}) => {
  const [riders, setRiders] = useState<DeliveryRider[]>(() => {
    return StorageService.getDeliveryRiders();
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRider, setEditingRider] = useState<DeliveryRider | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const persistRiders = async (newRiders: DeliveryRider[]) => {
    setRiders(newRiders);
    try {
      const updated = await StorageService.saveDeliveryRiders(newRiders);
      try {
        await ApiService.updateSettings(updated);
      } catch {}
      if (onSave) {
        await onSave(updated);
      }
      if (onRefreshData) onRefreshData();
    } catch (e) {
      console.warn('Failed to persist delivery riders', e);
    }
  };

  const handleOpenAddModal = () => {
    setEditingRider(null);
    setName('');
    setPhone('');
    setVehiclePlate('');
    setVehicleType('Honda CD-70');
    setIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rider: DeliveryRider) => {
    setEditingRider(rider);
    setName(rider.name);
    setPhone(rider.phone);
    setVehiclePlate(rider.vehiclePlate);
    setVehicleType(rider.vehicleType || 'Bike');
    setIsActive(rider.isActive);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveRiderForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Rider name is required.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Rider contact phone number is required.');
      return;
    }

    if (editingRider) {
      const updatedList = riders.map((r) =>
        r.id === editingRider.id
          ? {
              ...r,
              name: name.trim(),
              phone: phone.trim(),
              vehiclePlate: vehiclePlate.trim().toUpperCase(),
              vehicleType: vehicleType.trim(),
              isActive,
            }
          : r
      );
      await persistRiders(updatedList);
      sounds.playSuccess();
      showToast(`Updated rider ${name.trim()} successfully!`);
    } else {
      const newRider: DeliveryRider = {
        id: `rider-${Date.now()}`,
        name: name.trim(),
        phone: phone.trim(),
        vehiclePlate: vehiclePlate.trim().toUpperCase() || 'KHI-MOTORBIKE',
        vehicleType: vehicleType.trim() || 'Honda CD-70',
        isActive,
        totalDeliveries: 0,
      };
      const updatedList = [newRider, ...riders];
      await persistRiders(updatedList);
      sounds.playSuccess();
      showToast(`Added delivery rider ${newRider.name}!`);
    }

    setIsModalOpen(false);
  };

  const handleToggleActive = async (riderId: string) => {
    const updatedList = riders.map((r) =>
      r.id === riderId ? { ...r, isActive: !r.isActive } : r
    );
    await persistRiders(updatedList);
    sounds.playChime();
    const targeted = updatedList.find((r) => r.id === riderId);
    showToast(
      targeted?.isActive
        ? `${targeted.name} is now Available on duty!`
        : `${targeted?.name} is marked Off Duty.`
    );
  };

  const handleDeleteRider = async (riderId: string) => {
    const target = riders.find((r) => r.id === riderId);
    const updatedList = riders.filter((r) => r.id !== riderId);
    await persistRiders(updatedList);
    sounds.playChime();
    showToast(`Removed ${target?.name || 'rider'} from delivery fleet.`);
  };

  const activeRidersCount = riders.filter((r) => r.isActive).length;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
      {/* Toast */}
      {toastMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-2 animate-in slide-in-from-top">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-heading font-black text-white flex items-center gap-2">
                <span>Delivery Drivers Fleet &amp; Pre-Selected Riders</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {activeRidersCount} Active On Duty
                </span>
              </h4>
              <p className="text-xs text-neutral-400">
                Configure your riders roster. The kitchen portal can select these riders for orders, and customers/staff can call them directly with 1 tap.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Rider</span>
        </button>
      </div>

      {/* Riders Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {riders.map((rider) => (
          <div
            key={rider.id}
            className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
              rider.isActive
                ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                : 'bg-neutral-900/50 border-neutral-850 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                    rider.isActive
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-neutral-800 text-neutral-500 border border-neutral-750'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-bold text-white">{rider.name}</h5>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        rider.isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {rider.isActive ? 'Available' : 'Off Duty'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400 font-mono">
                    <span>Plate: <strong className="text-neutral-200">{rider.vehiclePlate}</strong></span>
                    <span>·</span>
                    <span>{rider.vehicleType || 'Motorbike'}</span>
                  </div>
                </div>
              </div>

              {/* Toggle On Duty */}
              <button
                type="button"
                onClick={() => handleToggleActive(rider.id)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  rider.isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                }`}
                title={rider.isActive ? 'Click to mark Off Duty' : 'Click to mark Available On Duty'}
              >
                {rider.isActive ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
              </button>
            </div>

            {/* Bottom Contact & Action Row */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800/80 text-xs">
              <a
                href={`tel:${rider.phone}`}
                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                title={`Direct Call: ${rider.phone}`}
              >
                <PhoneCall className="w-3 h-3 text-emerald-400" />
                <span>{rider.phone}</span>
              </a>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(rider)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Edit Rider"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRider(rider.id)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Delete Rider"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {riders.length === 0 && (
          <div className="col-span-full py-8 text-center bg-neutral-900/40 rounded-xl border border-neutral-800 text-neutral-500 space-y-2">
            <Bike className="w-8 h-8 mx-auto opacity-30 text-purple-400" />
            <p className="text-xs font-bold text-neutral-300">No Delivery Riders Configured</p>
            <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
              Add your branch delivery drivers here so the kitchen and customers can easily call them.
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Rider</span>
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Rider Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bike className="w-4 h-4 text-purple-400" />
                <h3 className="font-heading font-black text-sm text-white">
                  {editingRider ? 'Edit Delivery Rider' : 'Add New Delivery Rider'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-850"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRiderForm} className="p-4 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                  Rider Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tariq Mehmood, Bilal Khan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                  Mobile / Phone Number * (Used for Direct Calling)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0300-1234567 or +923128829102"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                    Vehicle Number Plate
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KHI-4921"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono uppercase placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                    Bike / Vehicle Model
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Honda CD-70, YBR"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 bg-neutral-950 border-neutral-800 focus:ring-purple-500"
                  />
                  <span className="text-xs font-semibold text-neutral-200">
                    Currently Active &amp; Available on Delivery Shifts
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingRider ? 'Save Changes' : 'Add Rider'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
