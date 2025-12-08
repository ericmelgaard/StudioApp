import { ArrowLeft, Palette, Image, Video, FileText, Layout } from 'lucide-react';

interface ThemePlaceholderProps {
  onBack: () => void;
  themeId?: string;
  themeName?: string;
}

export default function ThemePlaceholder({ onBack, themeName = 'Theme' }: ThemePlaceholderProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-slate-900">Theme Editor: {themeName}</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Layout className="w-10 h-10 text-blue-600" />
            </div>

            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Theme Editor Coming Soon
            </h2>

            <p className="text-lg text-slate-600 mb-8">
              The theme content editor is currently under development. This is where you'll be able to create and customize content for different display types.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 text-left">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Image className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Media Management</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Upload and organize images, videos, and other media assets for your themes
                </p>
              </div>

              <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 text-left">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Video className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Video Content</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Create and edit video content for digital displays with timeline editing
                </p>
              </div>

              <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 text-left">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Text & Templates</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Design text layouts and use pre-built templates for quick content creation
                </p>
              </div>

              <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 text-left">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Layout className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Multi-Display Support</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Optimize content for different display types including HD screens and ESLs
                </p>
              </div>
            </div>

            <button
              onClick={onBack}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Back to Themes
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
