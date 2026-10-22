import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertCircle,
  Copy,
  Check,
  BookOpen,
  ArrowRight,
  Terminal,
  Server,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const EXAMPLE_TOPICS = [
  'Photosynthesis in plants',
  'How DNS and internet routing work',
  "Newton's three laws of motion",
  'The basics of supply and demand',
  'How DNA carries genetic information',
];

function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function ExplanationView({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentBullets: string[] = [];

  const flushBullets = () => {
    if (currentBullets.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-2 space-y-1.5 list-disc pl-5 text-slate-700">
          {currentBullets.map((b, bi) => (
            <li key={bi} className="text-sm">
              <FormattedText text={b} />
            </li>
          ))}
        </ul>
      );
      currentBullets = [];
    }
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line || line === '---') {
      flushBullets();
      return;
    }

    if (line.startsWith('## ')) {
      flushBullets();
      elements.push(
        <div key={`h2-${index}`} className="pt-4 pb-1 border-b border-slate-100 flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-900">
            {line.replace(/^##\s+/, '')}
          </h3>
        </div>
      );
      return;
    }

    if (line.startsWith('### ')) {
      flushBullets();
      elements.push(
        <h4 key={`h3-${index}`} className="pt-2 text-sm font-bold text-slate-900">
          {line.replace(/^###\s+/, '')}
        </h4>
      );
      return;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      currentBullets.push(line.replace(/^[-*]\s+/, ''));
      return;
    }

    if (/^\d+\.\s+/.test(line)) {
      flushBullets();
      elements.push(
        <div key={`ol-${index}`} className="flex items-start gap-2 text-sm text-slate-700 my-1.5">
          <span className="font-bold text-indigo-600 flex-shrink-0">
            {line.match(/^\d+\./)?.[0]}
          </span>
          <div>
            <FormattedText text={line.replace(/^\d+\.\s+/, '')} />
          </div>
        </div>
      );
      return;
    }

    flushBullets();
    elements.push(
      <p key={`p-${index}`} className="text-sm text-slate-700 leading-relaxed my-2">
        <FormattedText text={line} />
      </p>
    );
  });

  flushBullets();

  return <div className="space-y-1">{elements}</div>;
}

export default function App() {
  const [topic, setTopic] = useState('');
  const [loadingType, setLoadingType] = useState<'explain' | 'quiz' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Results
  const [activeTab, setActiveTab] = useState<'explanation' | 'quiz'>('explanation');
  const [explanation, setExplanation] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [currentTopicTitle, setCurrentTopicTitle] = useState('');

  // Quiz Interaction state
  const [selectedAnswers, setSelectedAnswers] = useState<{ [qIndex: number]: number }>({});
  const [showResults, setShowResults] = useState(false);

  // Copy state
  const [copied, setCopied] = useState(false);

  // Deploy / Setup Modal
  const [showGuide, setShowGuide] = useState(false);

  const handleExplain = async (overrideTopic?: string) => {
    const targetTopic = (overrideTopic || topic).trim();
    if (!targetTopic) {
      setError('Please enter a question or topic first.');
      return;
    }

    setError(null);
    setLoadingType('explain');
    setCurrentTopicTitle(targetTopic);

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: targetTopic }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate explanation');
      }

      setExplanation(data.explanation);
      setActiveTab('explanation');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong while generating the explanation.');
    } finally {
      setLoadingType(null);
    }
  };

  const handleGenerateQuiz = async (overrideTopic?: string) => {
    const targetTopic = (overrideTopic || topic).trim();
    if (!targetTopic) {
      setError('Please enter a question or topic first.');
      return;
    }

    setError(null);
    setLoadingType('quiz');
    setCurrentTopicTitle(targetTopic);
    setSelectedAnswers({});
    setShowResults(false);

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: targetTopic }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate quiz');
      }

      setQuizQuestions(data.questions);
      setActiveTab('quiz');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong while generating quiz questions.');
    } finally {
      setLoadingType(null);
    }
  };

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    if (showResults) return; // Prevent changing once submitted
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setShowResults(false);
  };

  const calculateScore = () => {
    if (!quizQuestions) return 0;
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        score += 1;
      }
    });
    return score;
  };

  const copyToClipboard = () => {
    if (!explanation) return;
    navigator.clipboard.writeText(explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight flex items-center gap-2">
                AI Study Assistant
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Student Edition
                </span>
              </h1>
              <p className="text-xs text-slate-500">Break down topics & test your understanding</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGuide(true)}
              className="text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5" />
              Run & Deploy Guide
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Intro Hero & Input Card */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-4">
            <label htmlFor="topic-input" className="block text-sm font-semibold text-slate-800 mb-1">
              What would you like to study today?
            </label>
            <p className="text-xs text-slate-500">
              Type any question, subject, or academic topic to get a beginner-friendly breakdown or a 5-question practice quiz.
            </p>
          </div>

          <div className="relative">
            <textarea
              id="topic-input"
              rows={3}
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. How does photosynthesis work? What caused the American Civil War? Explain Newton's laws..."
              className="w-full rounded-xl border border-slate-300 p-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
            />
          </div>

          {/* Quick suggestions */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium mr-1">Quick ideas:</span>
            {EXAMPLE_TOPICS.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTopic(t);
                  setError(null);
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
              >
                {t}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1">
                <p className="font-medium">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700 font-bold text-xs"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => handleExplain()}
              disabled={loadingType !== null}
              className="flex-1 min-w-[180px] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {loadingType === 'explain' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Explaining with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Explain Topic</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleGenerateQuiz()}
              disabled={loadingType !== null}
              className="flex-1 min-w-[180px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {loadingType === 'quiz' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating 5 Questions...</span>
                </>
              ) : (
                <>
                  <HelpCircle className="w-4 h-4" />
                  <span>Generate 5-Question Quiz</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Loading Skeleton Indicator */}
        {loadingType !== null && (
          <div className="bg-white border border-indigo-100 rounded-2xl p-8 shadow-sm text-center space-y-4 animate-pulse">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
              {loadingType === 'explain' ? (
                <Sparkles className="w-6 h-6 animate-spin text-indigo-600" />
              ) : (
                <HelpCircle className="w-6 h-6 animate-bounce text-emerald-600" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                {loadingType === 'explain' ? 'Generating study breakdown...' : 'Crafting 5 practice quiz questions...'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Consulting Gemini 3.8 Flash via secure server backend. Please wait a moment.
              </p>
            </div>
          </div>
        )}

        {/* Results Container */}
        {(explanation || quizQuestions) && loadingType === null && (
          <div className="space-y-4">
            {/* View Switcher Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200">
              <div className="flex gap-2">
                {explanation && (
                  <button
                    onClick={() => setActiveTab('explanation')}
                    className={`pb-3 px-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === 'explanation'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Explanation
                  </button>
                )}
                {quizQuestions && (
                  <button
                    onClick={() => setActiveTab('quiz')}
                    className={`pb-3 px-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === 'quiz'
                        ? 'border-emerald-600 text-emerald-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    5-Question Quiz
                  </button>
                )}
              </div>

              {currentTopicTitle && (
                <div className="text-xs text-slate-500 pb-3 truncate max-w-xs hidden sm:block">
                  Topic: <span className="font-semibold text-slate-700">{currentTopicTitle}</span>
                </div>
              )}
            </div>

            {/* Explanation Tab Content */}
            {activeTab === 'explanation' && explanation && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Sparkles className="w-5 h-5" />
                    <h2 className="font-bold text-slate-900 text-lg">Study Breakdown</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Explanation text formatted nicely */}
                <div className="text-sm text-slate-700 leading-relaxed">
                  <ExplanationView content={explanation} />
                </div>

                {/* Next Action Box */}
                {!quizQuestions && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                        <HelpCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-900">Ready to test what you just learned?</h4>
                        <p className="text-xs text-emerald-700">Generate 5 multiple-choice questions based on this topic.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleGenerateQuiz(currentTopicTitle)}
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Take Quiz</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quiz Tab Content */}
            {activeTab === 'quiz' && quizQuestions && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <HelpCircle className="w-5 h-5" />
                    <h2 className="font-bold text-slate-900 text-lg">Practice Quiz (5 Questions)</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {showResults && (
                      <button
                        onClick={handleResetQuiz}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Retake Quiz
                      </button>
                    )}
                  </div>
                </div>

                {/* Score Banner when completed */}
                {showResults && (
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                      calculateScore() >= 4
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : calculateScore() >= 3
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-sm">
                        You scored {calculateScore()} out of {quizQuestions.length} ({Math.round((calculateScore() / quizQuestions.length) * 100)}%)
                      </h4>
                      <p className="text-xs mt-0.5 opacity-90">
                        {calculateScore() === 5
                          ? '🎉 Outstanding! You mastered this topic!'
                          : calculateScore() >= 3
                          ? '👏 Good job! Review the explanations below to solidify the concepts.'
                          : '💪 Keep practicing! Read the explanations below to understand where you can improve.'}
                      </p>
                    </div>

                    <button
                      onClick={handleResetQuiz}
                      className="px-3 py-1.5 bg-white text-slate-800 text-xs font-semibold rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors flex-shrink-0 cursor-pointer"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {/* Question List */}
                <div className="space-y-6">
                  {quizQuestions.map((q, qIdx) => {
                    const isAnswered = selectedAnswers[qIdx] !== undefined;
                    const userAnswer = selectedAnswers[qIdx];
                    const isCorrect = userAnswer === q.correctIndex;

                    return (
                      <div
                        key={q.id || qIdx}
                        className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            Question {qIdx + 1} of {quizQuestions.length}
                          </span>

                          {showResults && (
                            <span
                              className={`text-xs font-semibold flex items-center gap-1 ${
                                isCorrect ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {isCorrect ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4" /> Correct
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4" /> Incorrect
                                </>
                              )}
                            </span>
                          )}
                        </div>

                        <p className="font-medium text-slate-900 text-sm">{q.question}</p>

                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {q.options.map((opt, optIdx) => {
                            const isThisSelected = userAnswer === optIdx;
                            const isThisCorrect = optIdx === q.correctIndex;

                            let btnStyle = 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40';

                            if (!showResults && isThisSelected) {
                              btnStyle = 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold ring-1 ring-indigo-600';
                            } else if (showResults) {
                              if (isThisCorrect) {
                                btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-500';
                              } else if (isThisSelected && !isThisCorrect) {
                                btnStyle = 'border-rose-400 bg-rose-50 text-rose-950 line-through';
                              } else {
                                btnStyle = 'border-slate-200 bg-slate-100 text-slate-400 opacity-60';
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={showResults}
                                onClick={() => handleSelectOption(qIdx, optIdx)}
                                className={`p-3 rounded-lg border text-left text-xs transition-all flex items-start gap-2.5 cursor-pointer disabled:cursor-default ${btnStyle}`}
                              >
                                <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="flex-1">{opt}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation note when results are shown */}
                        {showResults && (
                          <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                              Explanation:
                            </span>
                            <p className="text-slate-600 leading-relaxed">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Submit Quiz button */}
                {!showResults && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setShowResults(true)}
                      disabled={Object.keys(selectedAnswers).length === 0}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <span>Submit Answers & See Results</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Feature Highlights for Beginners */}
        {!explanation && !quizQuestions && loadingType === null && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-slate-800">Clear Explanations</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Simple summaries, key concepts, everyday analogies, and takeaways structured for studying.
              </p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-slate-800">5-Question Practice</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Interactive multiple-choice quizzes with instant grading and explanations for every question.
              </p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-slate-800">Real & Secure AI</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Powered by Google Gemini 3.8 Flash. Server-side proxy protects credentials securely.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Running & Deployment Guide</h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <div>
                <h4 className="font-semibold text-slate-800 text-sm mb-1">1. How This App Works</h4>
                <p>
                  This application follows the recommended full-stack architecture. The React frontend interacts with an Express server (<code>server.ts</code>), which securely communicates with Google's <code>@google/genai</code> SDK using the <code>gemini-3.8-flash</code> model.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 text-sm mb-1">2. Environment Variables & Security</h4>
                <p>
                  Your API credentials are stored strictly in the server environment (<code>process.env.GEMINI_API_KEY</code>). Client code never touches or exposes the secret key.
                </p>
                <div className="mt-1.5 p-2.5 bg-slate-100 rounded-lg font-mono text-[11px] text-slate-800">
                  GEMINI_API_KEY="your-google-ai-api-key"
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 text-sm mb-1">3. Running Locally</h4>
                <div className="p-2.5 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] space-y-1">
                  <p># Install dependencies</p>
                  <p className="text-indigo-300">npm install</p>
                  <p className="pt-1"># Start development server (runs Express + Vite on port 3000)</p>
                  <p className="text-indigo-300">npm run dev</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 text-sm mb-1">4. Deploying to Production</h4>
                <div className="p-2.5 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] space-y-1">
                  <p># Build the Vite frontend client</p>
                  <p className="text-indigo-300">npm run build</p>
                  <p className="pt-1"># Start production server</p>
                  <p className="text-indigo-300">npm start</p>
                </div>
                <p className="mt-1.5 text-slate-500">
                  In production, Express serves the static assets from the <code>dist</code> directory while hosting the <code>/api/explain</code> and <code>/api/quiz</code> endpoints.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AI Study Assistant — Simple, encouraging learning companion</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Lock className="w-3 h-3" /> Secure Google AI Integration
          </span>
        </div>
      </footer>
    </div>
  );
}
