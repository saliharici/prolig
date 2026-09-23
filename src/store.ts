import { create } from 'zustand';

export interface Question {
  id: number;
  content: string;
  imageUrl: string | null;
  status: string;
  editorNote: string | null;
  objectiveCode?: string | null;
  grade?: string | null;
  difficulty?: string | null;
  createdAt: string;
}

interface AppState {
  questions: Question[];
  addQuestion: (question: Question) => void;
  updateQuestionStatus: (id: number, status: string) => void;
}

// Başlangıç için kurgusal (mock) sorular
const initialQuestions: Question[] = [
  {
    id: 101,
    content: "Aşağıdaki denklemin çözüm kümesi nedir? 2x + 5 = 15",
    imageUrl: null,
    status: "Bekliyor",
    editorNote: null,
    objectiveCode: "M.8.2.1",
    grade: "8. Sınıf",
    difficulty: "Kolay",
    createdAt: new Date().toISOString()
  },
  {
    id: 102,
    content: "Mitoz bölünmenin evrelerini sırasıyla yazınız.",
    imageUrl: null,
    status: "Onaylandı",
    editorNote: "Sorunun kökü biraz daha netleştirilebilir ama bu haliyle de uygun.",
    objectiveCode: "F.7.2.1",
    grade: "7. Sınıf",
    difficulty: "Orta",
    createdAt: new Date().toISOString()
  }
];

export const useAppStore = create<AppState>((set) => ({
  questions: initialQuestions,
  addQuestion: (question) => set((state) => ({ questions: [question, ...state.questions] })),
  updateQuestionStatus: (id, status) => set((state) => ({
    questions: state.questions.map(q => q.id === id ? { ...q, status } : q)
  }))
}));
