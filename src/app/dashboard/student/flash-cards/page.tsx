'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeftIcon, BrainIcon, Trash2Icon } from 'lucide-react';

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

interface FlashCard {
  id: string;
  front: string;
  back: string;
  hint?: string | null;
  created_at: string;
  last_reviewed?: string | null;
  ease_factor: number;
  interval_days: number;
  reps: number;
}

interface Deck {
  id: string;
  title: string;
  description?: string | null;
  created_at: string;
  cards: FlashCard[];
  dueToday: number;
  total: number;
}

// ────────────────────────────────────────────────
// Helper function to render cloze deletions
// ────────────────────────────────────────────────

function renderCloze(text: string): string {
  // Match {{c1::content}} or {{c2::content}} etc.
  // Simply extract the content, removing the cloze syntax
  return text.replace(/\{\{c\d+::(.*?)\}\}/g, (match, content) => content);
}

// ────────────────────────────────────────────────
// Main Flash Cards Page
// ────────────────────────────────────────────────

export default function FlashCardsPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  const [showCreateDeck, setShowCreateDeck] = useState<boolean>(false);
  const [newDeckTitle, setNewDeckTitle] = useState<string>('');
  const [newDeckDesc, setNewDeckDesc] = useState<string>('');

  // AI generation states
  const [showAIGenerate, setShowAIGenerate] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiNumCards, setAiNumCards] = useState<number | string>(15);
  const [generatingCards, setGeneratingCards] = useState<boolean>(false);

  const [deckToDelete, setDeckToDelete] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const currentDeck = decks.find((d) => d.id === selectedDeckId);
  const currentCard = currentDeck?.cards[currentCardIndex];

  // ────────────────────────────────────────────────
  // Load decks + cards
  // ────────────────────────────────────────────────

  const loadDecks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('flashcard_decks')
        .select(`
          id,
          title,
          description,
          created_at,
          cards:flashcards (
            id,
            front,
            back,
            hint,
            created_at,
            last_reviewed,
            ease_factor,
            interval_days,
            reps
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];

      const enriched = (data ?? []).map((deck) => ({
        ...deck,
        cards: deck.cards ?? [],
        total: deck.cards?.length ?? 0,
        dueToday:
          deck.cards?.filter((c) =>
            !c.last_reviewed || new Date(c.last_reviewed).toISOString().split('T')[0] <= today
          ).length ?? 0,
      }));

      setDecks(enriched);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load';
      console.error(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDecks();
  }, [loadDecks]);

  // ────────────────────────────────────────────────
  // Delete deck
  // ────────────────────────────────────────────────

  const confirmDeleteDeck = (deckId: string) => {
    setDeckToDelete(deckId);
  };

  const handleDeleteDeck = async () => {
    if (!deckToDelete) return;

    try {
      const { error } = await supabase
        .from('flashcard_decks')
        .delete()
        .eq('id', deckToDelete);

      if (error) throw error;

      setDecks((prev) => prev.filter((d) => d.id !== deckToDelete));
      if (selectedDeckId === deckToDelete) {
        setSelectedDeckId(null);
      }
      toast.success('Deck deleted');
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to delete deck');
    } finally {
      setDeckToDelete(null);
    }
  };

  // ────────────────────────────────────────────────
  // Create deck
  // ────────────────────────────────────────────────

  const handleCreateDeck = async () => {
    if (!newDeckTitle.trim()) return toast.error('Title required');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('flashcard_decks')
        .insert({
          title: newDeckTitle.trim(),
          description: newDeckDesc.trim() || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setDecks((prev) => [{ ...data, cards: [], total: 0, dueToday: 0 }, ...prev]);
      setShowCreateDeck(false);
      setNewDeckTitle('');
      setNewDeckDesc('');
      toast.success('Deck created!');
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to create deck');
    }
  };

  // ────────────────────────────────────────────────
  // Generate cards with AI (Gemini)
  // ────────────────────────────────────────────────

  const handleGenerateAICards = async () => {
    if (!selectedDeckId) {
      toast.error('Please select a deck first');
      return;
    }
    if (!aiPrompt.trim()) {
      toast.error('Please enter a topic or prompt');
      return;
    }

    setGeneratingCards(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Please sign in to generate cards');
        return;
      }

      // Call API to generate cards
      const res = await fetch('/api/generate/flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          numCards: Number(aiNumCards) || 15,
          deckId: selectedDeckId,
          userId: user.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server error ${res.status}`);
      }

      // Insert cards into database
      const inserts = data.cards.map((card: { front: string; back: string }) => ({
        deck_id: selectedDeckId,
        user_id: user.id,
        front: card.front,
        back: card.back,
        hint: null,
        created_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from("flashcards")
        .insert(inserts);

      if (insertError) {
        console.error('Insert failed:', insertError);
        throw new Error('Failed to save cards to database');
      }

      toast.success(`Generated ${data.count} cards!`);
      setShowAIGenerate(false);
      setAiPrompt('');
      setAiNumCards(15);

      await loadDecks();
    } catch (err) {
      console.error('AI generation failed:', err);
      toast.error((err as Error).message || 'Failed to generate cards');
    } finally {
      setGeneratingCards(false);
    }
  };

  // ────────────────────────────────────────────────
  // Study controls
  // ────────────────────────────────────────────────

  const flip = () => setIsFlipped(f => !f);

  const rateCard = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentDeck || !currentCard) return;

    let ease = currentCard.ease_factor ?? 2.5;
    let interval = currentCard.interval_days ?? 1;

    if (rating === 'again') {
      ease = Math.max(1.3, ease - 0.8);
      interval = 1;
    } else if (rating === 'hard') {
      ease = Math.max(1.3, ease - 0.15);
      interval = Math.max(1, Math.round(interval * 1.2));
    } else if (rating === 'good') {
      interval = Math.round(interval * ease);
    } else if (rating === 'easy') {
      ease += 0.15;
      interval = Math.round(interval * ease * 1.3);
    }

    try {
      await supabase
        .from('flashcards')
        .update({
          last_reviewed: new Date().toISOString(),
          ease_factor: ease,
          interval_days: interval,
          reps: (currentCard.reps ?? 0) + 1,
        })
        .eq('id', currentCard.id);

      nextCard();
      toast.success(rating.charAt(0).toUpperCase() + rating.slice(1));
    } catch {
      toast.error('Failed to save rating');
    }
  };

  const nextCard = () => {
    if (!currentDeck) return;
    setCurrentCardIndex((prev) => (prev + 1) % currentDeck.cards.length);
    setIsFlipped(false);
  };

  const prevCard = () => {
    if (!currentDeck) return;
    setCurrentCardIndex((prev) => (prev - 1 + currentDeck.cards.length) % currentDeck.cards.length);
    setIsFlipped(false);
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
            <Button variant="ghost" size="icon" onClick={() => selectedDeckId ? setSelectedDeckId(null) : window.history.back()}>
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent truncate max-w-[60vw]">
              {selectedDeckId ? currentDeck?.title : 'Flash Cards'}
            </h1>
          </div>

          {!selectedDeckId && (
            <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md" onClick={() => setShowCreateDeck(true)}>
              <BrainIcon className="mr-1.5 h-4 w-4" /> New Deck
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {!selectedDeckId ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {decks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <BrainIcon className="h-20 w-20 mb-6 opacity-50" />
                <p className="text-2xl font-medium mb-3">No decks yet</p>
                <p className="text-lg opacity-80">Create your first deck to start studying!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {decks.map(deck => (
                  <Card
                    key={deck.id}
                    className="bg-gray-900/70 border border-purple-900/30 hover:border-purple-500/60 transition-all cursor-pointer group backdrop-blur-sm relative"
                    onClick={() => {
                      setSelectedDeckId(deck.id);
                      setCurrentCardIndex(0);
                      setIsFlipped(false);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg group-hover:text-purple-300 transition-colors line-clamp-1 pr-12">
                        {deck.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <div className="flex justify-between text-gray-300">
                        <span>{deck.total} cards</span>
                        <span className={deck.dueToday > 0 ? "text-pink-400" : "text-emerald-400"}>
                          {deck.dueToday} due
                        </span>
                      </div>
                    </CardContent>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDeleteDeck(deck.id);
                      }}
                    >
                      <Trash2Icon className="h-5 w-5" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Deck study view
          <div className="flex-1 flex flex-col items-center justify-between p-4 sm:p-6 md:p-8">
            {/* Deck header with AI Generate button */}
            <div className="w-full flex items-center justify-between mb-6">
              <h2 className="text-3xl sm:text-4xl font-bold text-purple-300 text-center flex-1">
                {currentDeck?.title}
              </h2>

              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
                onClick={() => setShowAIGenerate(true)}
              >
                ✨ AI Generate
              </Button>
            </div>

          {/* Flashcard */}
      <div className="flex-1 flex items-center justify-center w-full max-w-4xl">
        <div className="relative w-full aspect-[4/3] max-h-[60vh]">
          <div
            className={cn(
              "relative w-full h-full transition-transform duration-700 ease-out rounded-xl overflow-hidden shadow-2xl shadow-black/60 cursor-pointer",
              isFlipped ? "scale-x-[-1]" : ""
            )}
            onClick={flip}
          >
            {/* Front */}
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center p-8 bg-gradient-to-br from-gray-900 to-black border border-purple-800/40",
                isFlipped && "hidden"
              )}
            >
              <p 
                className="font-bold text-center text-white drop-shadow-lg leading-tight break-words max-w-full"
                style={{
                  fontSize: 'clamp(1.5rem, 5vw, 4rem)',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}
              >
                {renderCloze(currentCard?.front || '')}
              </p>
            </div>

            {/* Back */}
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center p-8 bg-gradient-to-br from-gray-900 to-black border border-purple-800/40 scale-x-[-1]",
                !isFlipped && "hidden"
              )}
            >
              <div className="max-h-full overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-gray-800 w-full">
                <p 
                  className="font-semibold text-center text-gray-100 drop-shadow-lg leading-relaxed break-words"
                  style={{
                    fontSize: 'clamp(1.25rem, 4vw, 3rem)',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  {renderCloze(currentCard?.back || "No answer yet")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
            {/* Controls */}
            <div className="w-full max-w-lg flex flex-col items-center gap-6 mt-6">
              {!isFlipped ? (
                <Button
                  className="w-full sm:w-auto text-lg py-6 px-16 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-xl shadow-purple-900/40"
                  onClick={flip}
                >
                  Show Answer
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-4 w-full">
                  <Button variant="destructive" size="lg" className="py-6 text-base" onClick={() => rateCard('again')}>
                    Again
                  </Button>
                  <Button variant="secondary" size="lg" className="py-6 text-base" onClick={() => rateCard('hard')}>
                    Hard
                  </Button>
                  <Button className="py-6 text-base bg-green-600 hover:bg-green-700 col-span-2" onClick={() => rateCard('good')}>
                    Good
                  </Button>
                  <Button className="py-6 text-base bg-emerald-600 hover:bg-emerald-700 col-span-2" onClick={() => rateCard('easy')}>
                    Easy
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-8 text-gray-300 text-base">
                <Button variant="ghost" size="sm" onClick={prevCard}>Previous</Button>
                <span className="font-medium">
                  {currentCardIndex + 1} / {currentDeck?.cards.length ?? 0}
                </span>
                <Button variant="ghost" size="sm" onClick={nextCard}>Next</Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create Deck Dialog */}
      {showCreateDeck && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg bg-gray-900/95 border-purple-900/30 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-purple-300">Create New Deck</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Input
                placeholder="Deck title (e.g. Chemistry - Periodic Table)"
                value={newDeckTitle}
                onChange={(e) => setNewDeckTitle(e.target.value)}
                className="bg-gray-950 border-purple-800/50 focus:border-purple-500 text-white py-6"
              />
              <Textarea
                placeholder="Optional description or notes"
                value={newDeckDesc}
                onChange={(e) => setNewDeckDesc(e.target.value)}
                rows={3}
                className="bg-gray-950 border-purple-800/50 focus:border-purple-500 text-white"
              />
              <div className="flex justify-end gap-4">
                <Button variant="ghost" onClick={() => setShowCreateDeck(false)}>Cancel</Button>
                <Button
                  disabled={!newDeckTitle.trim()}
                  onClick={handleCreateDeck}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  Create Deck
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Generate Dialog */}
      {showAIGenerate && selectedDeckId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg bg-gray-900/95 border-purple-900/30 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-2xl text-purple-300">Generate Flashcards with AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Topic or Prompt</label>
                <Textarea
                  placeholder="Example: Create 20 flashcards about World War II key events for high school history"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={4}
                  className="bg-gray-950 border-purple-800/50 focus:border-purple-500 text-white resize-none"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">Number of cards (5–50)</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={aiNumCards}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (val === '') {
                      setAiNumCards('');
                    } else {
                      const num = Number(val);
                      if (num >= 5 && num <= 50) {
                        setAiNumCards(num);
                      } else if (num < 5) {
                        setAiNumCards(num); // Allow typing numbers less than 5 temporarily
                      } else {
                        setAiNumCards(50); // Cap at 50
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // On blur, enforce minimum of 5
                    const val = e.target.value;
                    if (val === '' || Number(val) < 5) {
                      setAiNumCards(5);
                    }
                  }}
                  placeholder="15"
                  className="bg-gray-950 border-purple-800/50 focus:border-purple-500 text-white"
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowAIGenerate(false)}
                  disabled={generatingCards}
                >
                  Cancel
                </Button>
                <Button
                  disabled={generatingCards || !aiPrompt.trim()}
                  onClick={handleGenerateAICards}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 min-w-[140px]"
                >
                  {generatingCards ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Generating...
                    </span>
                  ) : (
                    'Generate Cards'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Deck Confirmation */}
      <AlertDialog open={!!deckToDelete} onOpenChange={() => setDeckToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deck</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {decks.find(d => d.id === deckToDelete)?.title}?  
              This will permanently remove the deck and all its cards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteDeck}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}