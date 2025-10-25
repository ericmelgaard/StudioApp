import { Users, HelpCircle, FileText, ChevronDown, Store, Layers, Image, BarChart3, Video, FileText as Document, Palette, GripVertical } from 'lucide-react';
import { useState } from 'react';
import NotificationPanel from '../components/NotificationPanel';
import UserMenu from '../components/UserMenu';

interface CreatorDashboardProps {
  onBack: () => void;
}

type CardType = 'projects' | 'media' | 'analytics' | 'video' | 'templates' | 'brand';

interface DashboardCard {
  id: CardType;
  order: number;
}

const STORE_LOCATIONS = [
  'Admiral Food Market - Portland, OR',
  'Admiral Food Market - Seattle, WA',
  'Admiral Food Market - San Francisco, CA',
  'Admiral Food Market - Los Angeles, CA',
  'Admiral Food Market - San Diego, CA',
  'Admiral Food Market - Denver, CO',
];

export default function CreatorDashboard({ onBack }: CreatorDashboardProps) {
  const [selectedStore, setSelectedStore] = useState(STORE_LOCATIONS[0]);
  const [cards, setCards] = useState<DashboardCard[]>([
    { id: 'projects', order: 0 },
    { id: 'media', order: 1 },
    { id: 'analytics', order: 2 },
    { id: 'video', order: 3 },
    { id: 'templates', order: 4 },
    { id: 'brand', order: 5 },
  ]);
  const [draggedCard, setDraggedCard] = useState<CardType | null>(null);

  const handleDragStart = (cardId: CardType) => {
    setDraggedCard(cardId);
  };

  const handleDragOver = (e: React.DragEvent, targetCardId: CardType) => {
    e.preventDefault();
    if (!draggedCard || draggedCard === targetCardId) return;

    const newCards = [...cards];
    const draggedIndex = newCards.findIndex(c => c.id === draggedCard);
    const targetIndex = newCards.findIndex(c => c.id === targetCardId);

    const [removed] = newCards.splice(draggedIndex, 1);
    newCards.splice(targetIndex, 0, removed);

    newCards.forEach((card, index) => {
      card.order = index;
    });

    setCards(newCards);
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
  };

  const sortedCards = [...cards].sort((a, b) => a.order - b.order);

  const renderCard = (cardId: CardType) => {
    const commonProps = {
      draggable: true,
      onDragStart: () => handleDragStart(cardId),
      onDragOver: (e: React.DragEvent) => handleDragOver(e, cardId),
      onDragEnd: handleDragEnd,
      className: `bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition-all ${
        draggedCard === cardId ? 'opacity-50' : ''
      }`,
    };

    switch (cardId) {
      case 'projects':
        return (
          <div key={cardId} {...commonProps}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Content Projects
                </h3>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Layers className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">12</div>
                  <div className="text-sm text-slate-600">Active projects</div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <div className="text-sm text-slate-600">
                  Create and manage content projects
                </div>
              </div>
            </div>
          </div>
        );

      case 'media':
        return (
          <div key={cardId} {...commonProps}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Media Library
                </h3>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Image className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">248</div>
                  <div className="text-sm text-slate-600">Media assets</div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <div className="text-sm text-slate-600">
                  Upload and organize media files
                </div>
              </div>
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div key={cardId} {...commonProps}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Analytics
                </h3>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">89%</div>
                  <div className="text-sm text-slate-600">Engagement rate</div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <div className="text-sm text-slate-600">
                  View content performance metrics
                </div>
              </div>
            </div>
          </div>
        );

      case 'video':
        return (
          <div key={cardId} {...commonProps}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Video Content
                </h3>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-100 rounded-lg">
                  <Video className="w-8 h-8 text-rose-600" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">35</div>
                  <div className="text-sm text-slate-600">Video assets</div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <div className="text-sm text-slate-600">
                  Manage video content library
                </div>
              </div>
            </div>
          </div>
        );

      case 'templates':
        return (
          <div key={cardId} {...commonProps}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Templates
                </h3>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Document className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">18</div>
                  <div className="text-sm text-slate-600">Design templates</div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <div className="text-sm text-slate-600">
                  Browse and use templates
                </div>
              </div>
            </div>
          </div>
        );

      case 'brand':
        return (
          <div key={cardId} {...commonProps}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Brand Guidelines
                </h3>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-cyan-100 rounded-lg">
                  <Palette className="w-8 h-8 text-cyan-600" />
                </div>
                <div>
                  <div className="text-sm text-slate-900 font-medium">Style Guide</div>
                  <div className="text-sm text-slate-600">Brand assets & colors</div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <div className="text-sm text-slate-600">
                  Access brand resources
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <img
                  src="/WAND-Logo_Horizontal_Transp_Full-Color_White.png"
                  alt="WAND Digital"
                  className="h-8"
                />
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">|</span>
                  <span className="text-base font-semibold text-slate-700">Studio</span>
                </div>
              </div>
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
                  <Store className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-900 max-w-xs truncate">
                    {selectedStore}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-slate-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  {STORE_LOCATIONS.map((location) => (
                    <button
                      key={location}
                      onClick={() => setSelectedStore(location)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${
                        selectedStore === location ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                      }`}
                    >
                      {location}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Help"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <button
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Documentation"
              >
                <FileText className="w-5 h-5" />
              </button>
              <NotificationPanel />
              <UserMenu role="creator" onBackToRoles={onBack} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCards.map(card => renderCard(card.id))}
        </div>
      </main>
    </div>
  );
}
