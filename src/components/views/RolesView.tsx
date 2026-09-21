import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Plus, MoreVertical, Edit2, ShieldAlert, Check, X, Users, Settings } from 'lucide-react';
import { PageBanner } from '../PageBanner';

const mockRoles = [
  {
    id: 1,
    code: 'GENEL_KOORDINATOR',
    name: 'Genel Koordinatör',
    description: 'Sistemin tüm modüllerine ve yetkilerine sahip en üst düzey yöneticidir.',
    usersCount: 3,
    permissions: ['manage_users', 'manage_roles', 'approve_payments', 'view_all_projects', 'edit_system_settings']
  },
  {
    id: 2,
    code: 'IL_KOORDINATORU',
    name: 'İl Koordinatörü',
    description: 'Sadece atandığı ildeki yazar ve projeleri yönetme yetkisine sahiptir.',
    usersCount: 25,
    permissions: ['manage_local_users', 'view_local_projects']
  },
  {
    id: 3,
    code: 'EDITOR',
    name: 'Editör',
    description: 'Soru havuzundaki soruları inceleme, revizyon isteme ve onaylama yetkisine sahiptir.',
    usersCount: 18,
    permissions: ['review_questions', 'approve_questions']
  },
  {
    id: 4,
    code: 'YAZAR',
    name: 'Zümre Yazarı',
    description: 'Kurum bazında soru üretebilen ve havuza atabilen temel kullanıcı rolü.',
    usersCount: 145,
    permissions: ['submit_questions', 'view_own_payments']
  }
];

const availablePermissions = [
  { id: 'manage_users', label: 'Kullanıcı Yönetimi (Ekle/Sil)' },
  { id: 'manage_roles', label: 'Rol & Yetki Yönetimi' },
  { id: 'approve_payments', label: 'Hakediş & Ödeme Onayı' },
  { id: 'view_all_projects', label: 'Tüm Projeleri Görme' },
  { id: 'manage_local_users', label: 'Yerel (İl) Kullanıcı Yönetimi' },
  { id: 'view_local_projects', label: 'Yerel Projeleri Görme' },
  { id: 'review_questions', label: 'Soruları İnceleme (Revizyon)' },
  { id: 'approve_questions', label: 'Soruları Onaylama (Havuza Alma)' },
  { id: 'submit_questions', label: 'Soru Havuzuna Gönderim' },
  { id: 'view_own_payments', label: 'Kendi Hakedişlerini Görme' },
  { id: 'edit_system_settings', label: 'Sistem Ayarlarını Düzenleme' },
];

export const RolesView = () => {
  const [selectedRole, setSelectedRole] = useState(mockRoles[0]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPermissions, setEditedPermissions] = useState<string[]>([...selectedRole.permissions]);

  const togglePermission = (permId: string) => {
    if (editedPermissions.includes(permId)) {
      setEditedPermissions(editedPermissions.filter(p => p !== permId));
    } else {
      setEditedPermissions([...editedPermissions, permId]);
    }
  };

  const handleSave = () => {
    // API call simulate
    selectedRole.permissions = editedPermissions;
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedPermissions([...selectedRole.permissions]);
    setIsEditing(false);
  };

  const handleSelectRole = (role: typeof mockRoles[0]) => {
    setSelectedRole(role);
    setEditedPermissions([...role.permissions]);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <PageBanner
        title="Dinamik Yetki ve Rol Yönetimi (RBAC)"
        description="Sistemdeki kullanıcı rollerini, ince ayarlı yetkilerini (granular permissions) ve erişim kısıtlamalarını yönetin."
        icon={Shield}
        color="indigo"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sol Taraf - Rol Listesi */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Sistem Rolleri</h3>
            <button className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors">
              <Plus className="h-3.5 w-3.5" />
              <span>Yeni Rol</span>
            </button>
          </div>
          
          <div className="space-y-3">
            {mockRoles.map(role => (
              <div 
                key={role.id}
                onClick={() => handleSelectRole(role)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedRole.id === role.id 
                    ? 'bg-indigo-50 border-indigo-200 shadow-md ring-1 ring-indigo-500/20' 
                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`font-bold ${selectedRole.id === role.id ? 'text-indigo-700' : 'text-slate-800'}`}>
                    {role.name}
                  </h4>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    <Users className="h-3 w-3" />
                    {role.usersCount} Kişi
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {role.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Sağ Taraf - İnce Ayarlı Yetki Yönetimi (Granular Permissions) */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
            {/* Header */}
            <div className="border-b border-slate-100 bg-slate-50/50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-extrabold text-slate-800">{selectedRole.name}</h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase rounded bg-indigo-100 text-indigo-700">
                    {selectedRole.code}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{selectedRole.description}</p>
              </div>

              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button 
                      onClick={handleCancel}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      <span>İptal</span>
                    </button>
                    <button 
                      onClick={handleSave}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      <span>Kaydet</span>
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Yetkileri Düzenle</span>
                  </button>
                )}
              </div>
            </div>

            {/* Yetki Listesi */}
            <div className="p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                <ShieldAlert className="h-4 w-4 text-indigo-500" />
                Erişim İzinleri (Permissions)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availablePermissions.map(perm => {
                  const hasPermission = isEditing ? editedPermissions.includes(perm.id) : selectedRole.permissions.includes(perm.id);
                  
                  return (
                    <motion.div 
                      key={perm.id}
                      layout
                      onClick={() => isEditing && togglePermission(perm.id)}
                      className={`relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
                        isEditing ? 'cursor-pointer' : 'cursor-default opacity-80'
                      } ${
                        hasPermission 
                          ? 'border-indigo-500 bg-indigo-50/50' 
                          : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        hasPermission 
                          ? 'border-indigo-600 bg-indigo-600' 
                          : 'border-slate-300 bg-white'
                      }`}>
                        {hasPermission && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${hasPermission ? 'text-indigo-900' : 'text-slate-600'}`}>
                          {perm.label}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{perm.id}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
