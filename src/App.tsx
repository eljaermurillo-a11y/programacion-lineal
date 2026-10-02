import React, { useState, useMemo, useEffect } from 'react';
import { LPModel, LPSolution } from './types/lp';
import { INITIAL_MODEL, CASE_STUDIES } from './utils/presets';
import { solveLP } from './utils/simplex';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { EditorView } from './components/EditorView';
import { GraphView } from './components/GraphView';
import { SimplexView } from './components/SimplexView';
import { HistoryView } from './components/HistoryView';
import { ExportModal } from './components/ExportModal';
import { InfoModal } from './components/InfoModal';

const LOCAL_STORAGE_KEY = 'optilinear_saved_models';

export default function App() {
  const [model, setModel] = useState<LPModel>(() => {
    return INITIAL_MODEL;
  });

  const [activeTab, setActiveTab] = useState<TabType>('editor');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Saved models in localStorage
  const [savedModels, setSavedModels] = useState<LPModel[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // Sync savedModels to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedModels));
    } catch {
      // Ignore
    }
  }, [savedModels]);

  // Compute solution reactively
  const solution: LPSolution = useMemo(() => {
    return solveLP(model);
  }, [model]);

  // Reset to initial Mezcla Produccion model
  const handleResetModel = () => {
    if (window.confirm('¿Deseas restablecer el modelo a la formulación original de Mezcla de Producción?')) {
      setModel({
        ...INITIAL_MODEL,
        createdAt: Date.now()
      });
      setActiveTab('editor');
    }
  };

  const handleLoadCase = (id: string) => {
    const found = CASE_STUDIES.find((cs) => cs.id === id);
    if (found) {
      setModel({
        ...found,
        createdAt: Date.now()
      });
    }
  };

  const handleSaveCurrentModel = () => {
    const newSnapshot: LPModel = {
      ...model,
      id: `snapshot-${Date.now()}`,
      createdAt: Date.now()
    };
    setSavedModels((prev) => [newSnapshot, ...prev]);
    alert('¡Modelo guardado exitosamente en tu historial local!');
  };

  const handleDeleteSavedModel = (id: string) => {
    setSavedModels((prev) => prev.filter((m) => m.id !== id));
  };

  const handleLoadModel = (loaded: LPModel) => {
    setModel({
      ...loaded,
      createdAt: Date.now()
    });
    setActiveTab('editor');
  };

  return (
    <div className="min-h-screen bg-[#0a122a] text-[#dbe1ff] flex flex-col font-['Inter',sans-serif]">
      {/* Top Header */}
      <Header
        model={model}
        activeTab={activeTab}
        onResetModel={handleResetModel}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenInfo={() => setIsInfoOpen(true)}
      />

      {/* Main Screen Content with Top Offset for fixed header */}
      <main className="flex-1 w-full pt-20">
        {activeTab === 'editor' && (
          <EditorView
            model={model}
            onUpdateModel={setModel}
            onSolveAndNavigate={() => setActiveTab('graph')}
            onLoadCase={handleLoadCase}
            onOpenLibrary={() => setActiveTab('history')}
          />
        )}

        {activeTab === 'graph' && (
          <GraphView
            model={model}
            solution={solution}
            onNavigateToSimplex={() => setActiveTab('simplex')}
            onNavigateToEditor={() => setActiveTab('editor')}
          />
        )}

        {activeTab === 'simplex' && (
          <SimplexView
            model={model}
            solution={solution}
            onNavigateToGraph={() => setActiveTab('graph')}
            onNavigateToEditor={() => setActiveTab('editor')}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            currentModel={model}
            savedModels={savedModels}
            onLoadModel={handleLoadModel}
            onSaveCurrentModel={handleSaveCurrentModel}
            onDeleteSavedModel={handleDeleteSavedModel}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation Bar */}
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* Export & LaTeX Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        model={model}
        solution={solution}
      />

      {/* Info & Settings Modal */}
      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
    </div>
  );
}
