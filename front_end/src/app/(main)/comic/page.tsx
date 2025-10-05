"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  BookOpen,
  Download,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAppContext, ComicSessionData } from "@/contexts/AppContext";
import { generateComic, getComicExamples } from "@/lib/api";

const gradientPalette = [
  { from: "#fddb92", to: "#d1fdff" },
  { from: "#f6d365", to: "#fda085" },
  { from: "#a1c4fd", to: "#c2e9fb" },
  { from: "#ffecd2", to: "#fcb69f" },
  { from: "#fccb90", to: "#d57eeb" },
  { from: "#f9d423", to: "#ff4e50" },
] as const;

const highlightCard = {
  id: "highlight",
  title: "Mission storyboard",
  summary: "Curated layouts from the NASA Space Apps vault — explore panel pacing, framing, and cosmic palettes.",
  gradientFrom: "#3023ae",
  gradientTo: "#c86dd7",
};

type ComicSession = ComicSessionData;

const pickGradient = (index: number) => {
  const palette = gradientPalette[index % gradientPalette.length];
  return { from: palette.from, to: palette.to };
};

export default function ComicPage() {
  const { addToComicHistory, comicSession, setComicSession } = useAppContext();
  const [storyIdea, setStoryIdea] = useState("");
  const [pagesRequested, setPagesRequested] = useState<1 | 2>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activePageIndex, setActivePageIndex] = useState(0);

  const exampleStories = getComicExamples();
  const session = comicSession;

  const releaseSessionResources = (value: ComicSession | null) => {
    if (!value) return;
    value.pages.forEach((page) => {
      if (page.imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(page.imageUrl);
      }
    });
  };

  const handleGenerate = async (idea?: string, pageCount?: 1 | 2) => {
    const story = (idea ?? storyIdea).trim();
    const count = pageCount ?? pagesRequested;
    if (!story) return;

    setIsGenerating(true);
    try {
      const comic = await generateComic(story, count);
      const gradientIndex = Math.floor(Math.random() * gradientPalette.length);
      const { from, to } = pickGradient(gradientIndex);
      if (comicSession) {
        releaseSessionResources(comicSession);
      }
      const newSession: ComicSession = {
        id: `${Date.now()}`,
        storyIdea: story,
        pagesRequested: count,
        pages: comic,
        gradientFrom: from,
        gradientTo: to,
      };

      setComicSession(newSession);
      addToComicHistory(story);
      setStoryIdea("");
      setActivePageIndex(0);
    } catch (error) {
      console.error("Failed to generate comic:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!comicSession) {
      setIsDialogOpen(false);
      return;
    }

    if (activePageIndex > comicSession.pages.length - 1) {
      setActivePageIndex(0);
    }
  }, [comicSession, activePageIndex]);

  const cardsToShow: Array<
    | { type: "session"; data: ComicSession }
    | { type: "highlight"; data: typeof highlightCard }
  > = [];

  if (session) {
    cardsToShow.push({ type: "session", data: session });
  }

  cardsToShow.push({ type: "highlight", data: highlightCard });

  const limitedCards = cardsToShow.slice(0, 2);

  const handleDownload = () => {
    if (!session?.pages.length) return;
    const blob = new Blob([
      JSON.stringify({
        story: session.storyIdea,
        pages: session.pages,
      }, null, 2),
    ], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = session.storyIdea.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "comic";
    link.href = url;
    link.download = `${safeName}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openViewer = (index = 0) => {
    if (!session) return;
    setActivePageIndex(index);
    setIsDialogOpen(true);
  };

  const handleViewerChange = (direction: "prev" | "next") => {
    if (!session) return;
    setActivePageIndex((prev) => {
      const total = session.pages.length;
      if (direction === "prev") {
        return prev === 0 ? total - 1 : prev - 1;
      }
      return prev === total - 1 ? 0 : prev + 1;
    });
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#0b0d18] via-[#05070f] to-[#03040a] text-white pb-20">
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-12 space-y-12">
        <header className="space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-amber-200">
            <Sparkles className="h-3.5 w-3.5" /> Cosmic panel lab
          </span>
          <h1 className="text-4xl font-bold sm:text-5xl">Storyboard your mission</h1>
          <p className="max-w-xl text-sm text-zinc-400 sm:text-base">
            Craft bite-sized comics inspired by NASA space biology. Feed in a prompt, pick the number of pages, and we will sketch the beats.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          {limitedCards.map((card) => {
            if (card.type === "session") {
              const current = card.data;
              return (
                <button
                  type="button"
                  key={current.id}
                  onClick={() => openViewer(0)}
                  className="relative overflow-hidden rounded-3xl p-6 text-left shadow-lg transition hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
                  style={{
                    background: `linear-gradient(150deg, ${current.gradientFrom}, ${current.gradientTo})`,
                  }}
                >
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="relative flex h-full flex-col justify-between gap-6 text-white">
                    <div className="space-y-3">
                      <Badge className="rounded-full border-none bg-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-white">
                        Latest storyboard
                      </Badge>
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold leading-tight">{current.storyIdea}</h3>
                        <p className="text-sm text-white/80">
                          {current.pagesRequested} page{current.pagesRequested > 1 ? "s" : ""} • {current.pagesRequested * 4} panels drafted
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/80">
                      <span className="inline-flex items-center gap-2">
                        <BookOpen className="h-4 w-4" /> Preview below
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Download className="h-3.5 w-3.5" /> Export JSON
                      </span>
                    </div>
                  </div>
                </button>
              );
            }

            const highlight = card.data;
            return (
              <div
                key={highlight.id}
                className="flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg"
              >
                <div className="space-y-3">
                  <Badge className="rounded-full border-none bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-white">
                    Spotlight
                  </Badge>
                  <h3 className="text-2xl font-semibold text-white">{highlight.title}</h3>
                  <p className="text-sm text-zinc-300">{highlight.summary}</p>
                </div>
                <div
                  className="mt-6 rounded-2xl p-5 text-sm text-white"
                  style={{
                    background: `linear-gradient(150deg, ${highlight.gradientFrom}, ${highlight.gradientTo})`,
                  }}
                >
                  <p className="mb-4 font-semibold uppercase tracking-[0.3em] text-white/80">
                    Quick prompts
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {exampleStories.slice(0, 2).map((story) => (
                      <Button
                        key={story}
                        variant="ghost"
                        className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
                        onClick={() => handleGenerate(story)}
                      >
                        {story}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {session && session.pages.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Page previews</h2>
                <p className="text-sm text-zinc-400">Mock panels ready for your artist handoff</p>
              </div>
              <Button
                variant="ghost"
                className="rounded-full border border-white/10 bg-white/5 px-4 text-xs uppercase tracking-[0.3em] text-white hover:bg-white/10"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" /> Export story blueprint
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {session.pages.map((page) => (
                <button
                  type="button"
                  key={page.pageNumber}
                  onClick={() => openViewer(page.pageNumber - 1)}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 text-left shadow-sm transition hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
                >
                  <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                    <span className="text-sm font-semibold text-white">Page {page.pageNumber}</span>
                    <Badge className="rounded-full border-none bg-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white">
                      4 panels
                    </Badge>
                  </div>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/15">
                    <Image
                      src={page.imageUrl}
                      alt={`Generated comic page ${page.pageNumber}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      unoptimized
                    />
                  </div>
                  <p className="mt-3 text-sm text-zinc-300">
                    {page.title || "Storyboard concept"}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Create a new comic</h2>
              <p className="text-sm text-zinc-400">
                Outline a scenario and choose how many pages the AI should storyboard. We keep things light—just enough detail for handoff.
              </p>
            </div>
            <Textarea
              placeholder="e.g., A tomato plant named Tom discovers how to grow tall in space by following the special LED lights..."
              value={storyIdea}
              onChange={(event) => setStoryIdea(event.target.value)}
              className="min-h-32 resize-none rounded-2xl border-white/10 bg-black/40 text-sm text-white placeholder:text-zinc-500"
            />
            <div className="flex flex-wrap gap-2">
              {exampleStories.slice(0, 3).map((story) => (
                <Button
                  key={story}
                  variant="ghost"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:bg-amber-500/10 hover:text-white"
                  onClick={() => setStoryIdea(story)}
                >
                  {story}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[1, 2].map((count) => (
                <Button
                  key={count}
                  variant={pagesRequested === count ? "default" : "outline"}
                  className="rounded-full border border-white/10 bg-white/5 px-4 text-xs uppercase tracking-[0.3em] text-white hover:bg-white/10"
                  onClick={() => setPagesRequested(count as 1 | 2)}
                >
                  {count} page{count > 1 ? "s" : ""}
                </Button>
              ))}
            </div>
            <Button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !storyIdea.trim()}
              className="h-11 w-full gap-2 rounded-full bg-amber-500 px-6 text-black shadow-lg shadow-amber-500/30 transition hover:bg-amber-400 sm:w-auto"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Crafting panels...
                </>
              ) : (
                <>
                  <BookOpen className="h-5 w-5" />
                  Generate comic
                </>
              )}
            </Button>
          </div>
        </section>
      </div>

      <Dialog open={isDialogOpen && !!session} onOpenChange={(open) => setIsDialogOpen(open)}>
        <DialogContent className="max-w-3xl border border-white/10 bg-[#05070f] text-white">
          {session && session.pages[activePageIndex] && (
            <>
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-2xl font-semibold text-white">
                  {session.storyIdea}
                </DialogTitle>
                <DialogDescription className="text-sm text-zinc-400">
                  Page {session.pages[activePageIndex].pageNumber} of {session.pages.length}
                </DialogDescription>
              </DialogHeader>

              <div className="relative mt-4">
                <div className="relative mx-auto h-[60vh] max-h-[720px] w-full overflow-hidden rounded-3xl border border-white/15">
                  <Image
                    src={session.pages[activePageIndex].imageUrl}
                    alt={`Comic page ${session.pages[activePageIndex].pageNumber}`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 70vw"
                    unoptimized
                  />
                </div>
                {session.pages.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/20"
                      onClick={() => handleViewerChange("prev")}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/20"
                      onClick={() => handleViewerChange("next")}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>

              <p className="mt-4 text-sm text-zinc-300">
                {session.pages[activePageIndex].title || "Storyboard concept"}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
