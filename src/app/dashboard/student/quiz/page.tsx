'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeftIcon, BrainIcon, Trash2Icon, CheckCircle2Icon, XCircleIcon } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

interface QuizQuestion {
  id: string;
  question: string;
  correct_answer: string;
  created_at: string;
}

interface Quiz {
  id: string;
  title: string;
  description?: string | null;
  created_at: string;
  questions: QuizQuestion[];
  total: number;
}

interface UserAnswer {
  questionId: string;
  answer: string;
}

interface GradedAnswer {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  feedback: string;
}

// ────────────────────────────────────────────────
// Main Quiz Page
// ────────────────────────────────────────────────

export default function QuizPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [gradedAnswers, setGradedAnswers] = useState<GradedAnswer[]>([]);
  const [isGrading, setIsGrading] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);

  const [showCreateQuiz, setShowCreateQuiz] = useState<boolean>(false);
  const [newQuizTitle, setNewQuizTitle] = useState<string>('');
  const [newQuizDesc, setNewQuizDesc] = useState<string>('');

  // AI generation states
  const [showAIGenerate, setShowAIGenerate] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiNumQuestions, setAiNumQuestions] = useState<number | string>(10);
  const [generatingQuiz, setGeneratingQuiz] = useState<boolean>(false);

  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const currentQuiz = quizzes.find((q) => q.id === selectedQuizId);

  // ────────────────────────────────────────────────
  // Load quizzes + questions
  // ────────────────────────────────────────────────

  const loadQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          id,
          title,
          description,
          created_at,
          questions:quiz_questions (
            id,
            question,
            correct_answer,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enriched = (data ?? []).map((quiz) => ({
        ...quiz,
        questions: quiz.questions ?? [],
        total: quiz.questions?.length ?? 0,
      }));

      setQuizzes(enriched);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load';
      console.error(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuizzes();
  }, [loadQuizzes]);

  // ────────────────────────────────────────────────
  // Delete quiz
  // ────────────────────────────────────────────────

  const confirmDeleteQuiz = (quizId: string) => {
    setQuizToDelete(quizId);
  };

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;

    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizToDelete);

      if (error) throw error;

      setQuizzes((prev) => prev.filter((q) => q.id !== quizToDelete));
      if (selectedQuizId === quizToDelete) {
        setSelectedQuizId(null);
      }
      toast.success('Quiz deleted');
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to delete quiz');
    } finally {
      setQuizToDelete(null);
    }
  };

  // ────────────────────────────────────────────────
  // Create quiz
  // ────────────────────────────────────────────────

  const handleCreateQuiz = async () => {
    if (!newQuizTitle.trim()) return toast.error('Title required');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('quizzes')
        .insert({
          title: newQuizTitle.trim(),
          description: newQuizDesc.trim() || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setQuizzes((prev) => [{ ...data, questions: [], total: 0 }, ...prev]);
      setShowCreateQuiz(false);
      setNewQuizTitle('');
      setNewQuizDesc('');
      toast.success('Quiz created!');
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to create quiz');
    }
  };

  // ────────────────────────────────────────────────
  // Generate quiz with AI
  // ────────────────────────────────────────────────

  const handleGenerateAIQuiz = async () => {
    if (!selectedQuizId) {
      toast.error('Please select a quiz first');
      return;
    }
    if (!aiPrompt.trim()) {
      toast.error('Please enter a topic or prompt');
      return;
    }

    setGeneratingQuiz(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Please sign in to generate quiz');
        return;
      }

      const res = await fetch('/api/generate/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          numQuestions: Number(aiNumQuestions) || 10,
          quizId: selectedQuizId,
          userId: user.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server error ${res.status}`);
      }

      interface GeneratedQuestion {
        question: string;
        correct_answer: string;
      }

      const inserts = data.questions.map((q: GeneratedQuestion) => ({
        quiz_id: selectedQuizId,
        question: q.question,
        correct_answer: q.correct_answer,
        created_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('quiz_questions')
        .insert(inserts);

      if (insertError) {
        console.error('Insert failed:', insertError);
        throw new Error('Failed to save questions to database');
      }

      toast.success(`Generated ${data.count} questions!`);
      setShowAIGenerate(false);
      setAiPrompt('');
      setAiNumQuestions(10);

      await loadQuizzes();
    } catch (err) {
      console.error('AI generation failed:', err);
      toast.error((err as Error).message || 'Failed to generate quiz');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  // ────────────────────────────────────────────────
  // Handle user answers
  // ────────────────────────────────────────────────

  const handleAnswerChange = (questionId: string, answer: string) => {
    setUserAnswers(prev => {
      const existing = prev.find(a => a.questionId === questionId);
      if (existing) {
        return prev.map(a => a.questionId === questionId ? { ...a, answer } : a);
      }
      return [...prev, { questionId, answer }];
    });
  };

  const getUserAnswer = (questionId: string): string => {
    return userAnswers.find(a => a.questionId === questionId)?.answer || '';
  };

  // ────────────────────────────────────────────────
  // Submit quiz for AI grading
  // ────────────────────────────────────────────────

  const handleSubmitQuiz = async () => {
    if (!currentQuiz) return;

    // Check if all questions are answered
    const unanswered = currentQuiz.questions.filter(q => !getUserAnswer(q.id).trim());
    if (unanswered.length > 0) {
      toast.error(`Please answer all questions (${unanswered.length} remaining)`);
      return;
    }

    setIsGrading(true);

    try {
      // Prepare questions and answers for grading
      const gradingData = currentQuiz.questions.map(q => ({
        question: q.question,
        correctAnswer: q.correct_answer,
        userAnswer: getUserAnswer(q.id),
        questionId: q.id,
      }));

      const res = await fetch('/api/grade/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: gradingData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to grade quiz');
      }

      setGradedAnswers(data.results);
      setShowResults(true);
      toast.success('Quiz graded!');
    } catch (err) {
      console.error('Grading failed:', err);
      toast.error((err as Error).message || 'Failed to grade quiz');
    } finally {
      setIsGrading(false);
    }
  };

  const restartQuiz = () => {
    setUserAnswers([]);
    setGradedAnswers([]);
    setShowResults(false);
  };

  const calculateScore = () => {
    const correct = gradedAnswers.filter(a => a.isCorrect).length;
    const total = gradedAnswers.length;
    return { correct, total, percentage: total > 0 ? Math.round((correct / total) * 100) : 0 };
  };

  // ────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-950 via-black to-gray-950">
      <div className="animate-spin h-12 w-12 border-t-4 border-purple-500 rounded-full" />
    </div>
  );

  if (error) return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-950 via-black to-gray-950 p-6">
      <Alert variant="destructive" className="max-w-lg w-full">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-purple-900/40 bg-black/70 backdrop-blur-lg z-10 shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => {
              if (selectedQuizId) {
                setSelectedQuizId(null);
                setShowResults(false);
                setUserAnswers([]);
                setGradedAnswers([]);
              } else {
                window.history.back();
              }
            }}>
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent truncate max-w-[60vw]">
              {selectedQuizId ? currentQuiz?.title : 'Quizzes'}
            </h1>
          </div>

          {!selectedQuizId && (
            <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md" onClick={() => setShowCreateQuiz(true)}>
              <BrainIcon className="mr-1.5 h-4 w-4" /> New Quiz
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {!selectedQuizId ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {quizzes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <BrainIcon className="h-20 w-20 mb-6 opacity-50" />
                <p className="text-2xl font-medium mb-3">No quizzes yet</p>
                <p className="text-lg opacity-80">Create your first quiz to start learning!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {quizzes.map(quiz => (
                  <Card
                    key={quiz.id}
                    className="bg-gray-900/70 border border-purple-900/30 hover:border-purple-500/60 transition-all cursor-pointer group backdrop-blur-sm relative"
                    onClick={() => {
                      setSelectedQuizId(quiz.id);
                      setUserAnswers([]);
                      setGradedAnswers([]);
                      setShowResults(false);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg group-hover:text-purple-300 transition-colors line-clamp-1 pr-12">
                        {quiz.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <div className="flex justify-between text-gray-300">
                        <span>{quiz.total} questions</span>
                      </div>
                    </CardContent>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDeleteQuiz(quiz.id);
                      }}
                    >
                      <Trash2Icon className="h-5 w-5" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : showResults ? (
          // Results view
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <Card className="bg-gray-900/70 border border-purple-900/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-3xl text-center text-purple-300">Quiz Complete!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-purple-400 mb-2">
                      {calculateScore().percentage}%
                    </div>
                    <div className="text-xl text-gray-300">
                      {calculateScore().correct} out of {calculateScore().total} correct
                    </div>
                  </div>

                  <div className="flex gap-4 justify-center pt-4">
                    <Button onClick={restartQuiz} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                      Retake Quiz
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setSelectedQuizId(null);
                      setShowResults(false);
                      setUserAnswers([]);
                      setGradedAnswers([]);
                    }}>
                      Back to Quizzes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Results */}
              <div className="space-y-4">
                {currentQuiz?.questions.map((q, idx) => {
                  const graded = gradedAnswers.find(g => g.questionId === q.id);
                  if (!graded) return null;

                  return (
                    <Card key={q.id} className={cn(
                      "bg-gray-900/70 border backdrop-blur-sm",
                      graded.isCorrect ? "border-green-500/30" : "border-red-500/30"
                    )}>
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          {graded.isCorrect ? (
                            <CheckCircle2Icon className="h-6 w-6 text-green-400 shrink-0 mt-1" />
                          ) : (
                            <XCircleIcon className="h-6 w-6 text-red-400 shrink-0 mt-1" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm text-gray-400 mb-2">Question {idx + 1}</p>
                            <CardTitle className="text-xl text-white">{q.question}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Your Answer:</p>
                          <p className={cn(
                            "text-base p-3 rounded-lg",
                            graded.isCorrect ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"
                          )}>
                            {graded.userAnswer}
                          </p>
                        </div>

                        {!graded.isCorrect && (
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Correct Answer:</p>
                            <p className="text-base p-3 rounded-lg bg-green-500/10 text-green-300">
                              {graded.correctAnswer}
                            </p>
                          </div>
                        )}

                        {graded.feedback && (
                          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="text-sm text-blue-300 font-semibold mb-1">AI Feedback:</p>
                            <p className="text-gray-300">{graded.feedback}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          // Quiz taking view
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Quiz header with AI Generate button */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl sm:text-4xl font-bold text-purple-300">
                  {currentQuiz?.title}
                </h2>

                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
                  onClick={() => setShowAIGenerate(true)}
                >
                  ✨ AI Generate
                </Button>
              </div>

              {/* Questions */}
              <div className="space-y-6">
                {currentQuiz?.questions.map((q, idx) => (
                  <Card key={q.id} className="bg-gray-900/70 border border-purple-800/40 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold shrink-0">
                          {idx + 1}
                        </div>
                        <CardTitle className="text-xl text-white leading-relaxed pt-1">
                          {q.question}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Type your answer here..."
                        value={getUserAnswer(q.id)}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        rows={3}
                        className="bg-gray-950 border-purple-800/50 focus:border-purple-500 text-white resize-none"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-6 pb-8">
                <Button
                  size="lg"
                  disabled={isGrading || userAnswers.length !== currentQuiz?.questions.length}
                  onClick={handleSubmitQuiz}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-xl shadow-purple-900/40 px-16 py-6 text-lg"
                >
                  {isGrading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Grading...
                    </span>
                  ) : (
                    'Submit Quiz'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create Quiz Dialog */}
      {showCreateQuiz && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg bg-gray-900/95 border-purple-900/30 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-purple-300">Create New Quiz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Input
                placeholder="Quiz title (e.g. World History - WWI)"
                value={newQuizTitle}
                onChange={(e) => setNewQuizTitle(e.target.value)}
                className="bg-gray-950 border-purple-800/50 focus:border-purple-500 text-white py-6"
              />
              <Textarea
                placeholder="Optional description or notes"
                value={newQuizDesc}
                onChange={(e) => setNewQuizDesc(e.target.value)}
                rows={3}
                className="bg-gray-950 border-purple-800/50 focus:border-purple-500 text-white"
              />
              <div className="flex justify-end gap-4">
                <Button variant="ghost" onClick={() => setShowCreateQuiz(false)}>Cancel</Button>
                <Button
                  disabled={!newQuizTitle.trim()}
                  onClick={handleCreateQuiz}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  Create Quiz
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Generate Dialog */}
      {showAIGenerate && selectedQuizId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg bg-gray-900/95 border-purple-900/30 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-2xl text-purple-300">Generate Quiz with AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Topic or Prompt</label>
                <Textarea
                  placeholder="Example: Create 10 questions about the French Revolution for high school students"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={4}
                  className="bg-gray-950 border-purple-800/50 focus:border-purple-500 text-white resize-none"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">Number of questions (5–30)</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={aiNumQuestions}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (val === '') {
                      setAiNumQuestions('');
                    } else {
                      const num = Number(val);
                      if (num >= 5 && num <= 30) {
                        setAiNumQuestions(num);
                      } else if (num < 5) {
                        setAiNumQuestions(num);
                      } else {
                        setAiNumQuestions(30);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val === '' || Number(val) < 5) {
                      setAiNumQuestions(5);
                    }
                  }}
                  placeholder="10"
                  className="bg-gray-950 border-purple-800/50 focus:border-purple-500 text-white"
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowAIGenerate(false)}
                  disabled={generatingQuiz}
                >
                  Cancel
                </Button>
                <Button
                  disabled={generatingQuiz || !aiPrompt.trim()}
                  onClick={handleGenerateAIQuiz}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 min-w-[140px]"
                >
                  {generatingQuiz ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Generating...
                    </span>
                  ) : (
                    'Generate Quiz'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Quiz Confirmation */}
      <AlertDialog open={!!quizToDelete} onOpenChange={() => setQuizToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quiz</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {quizzes.find(q => q.id === quizToDelete)?.title}?  
              This will permanently remove the quiz and all its questions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteQuiz}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}