import { Role } from '@/types';

interface RoleCardProps {
  role: Role;
  isActive: boolean;
  onClick: () => void;
}

export function RoleCard({ role, isActive, onClick }: RoleCardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg overflow-hidden cursor-pointer transition-all ${
        isActive
          ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-950'
          : 'hover:ring-1 hover:ring-neutral-600'
      }`}
    >
      <div className="aspect-square bg-neutral-800">
        {role.card.image ? (
          <img
            src={role.card.image}
            alt={role.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600">
            无图片
          </div>
        )}
      </div>
      <div className="p-2 bg-neutral-900">
        <h4 className="text-sm font-medium text-white truncate">{role.name}</h4>
        <p className="text-xs text-neutral-500 line-clamp-2 mt-0.5">
          {role.card.description || '暂无描述'}
        </p>
        <div className="flex gap-1 mt-2">
          {role.variants.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-500">
              {role.variants.length} 变体
            </span>
          )}
          {role.versions.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-500">
              v{role.versions.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
