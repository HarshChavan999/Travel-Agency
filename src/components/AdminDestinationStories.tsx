'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Key,
  Layers,
  Search,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Sliders,
  MapPin,
  Tag,
  DollarSign,
  Globe,
  Compass,
  AlertCircle,
  Save,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export interface DestinationStory {
  id: string;
  stateName: string;
  title: string;
  storyHeading?: string;
  narrative: string;
  seoKeywords: string[];
  discoveredPlaces: string[];
  experienceTags: string[];
  packageCount: number;
  startingPrice: number | null;
  coverImage: string | null;
  featuredPackageIds?: string[];
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AdminDestinationStoriesProps {
  packages?: any[];
}

export default function AdminDestinationStories({ packages = [] }: AdminDestinationStoriesProps) {
  // Key Settings State
  const [showKeySettings, setShowKeySettings] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [keySavedToast, setKeySavedToast] = useState(false);

  // Generator Form State
  const [packagesCount, setPackagesCount] = useState<number>(15);
  const [storiesCount, setStoriesCount] = useState<number>(3);
  const [seoKeywords, setSeoKeywords] = useState<string>('Trending destinations, family trips, luxury staycations, budget travel deals');
  const [stateFilter, setStateFilter] = useState<string>('');

  // Generation Status
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);

  // Stories Data
  const [generatedStories, setGeneratedStories] = useState<DestinationStory[]>([]);
  const [publishedStories, setPublishedStories] = useState<DestinationStory[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(true);
  const [savingStoryId, setSavingStoryId] = useState<string | null>(null);

  // Edit Modal/Inline State
  const [editingStory, setEditingStory] = useState<DestinationStory | null>(null);

  // Load custom key from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('GEMINI_STORIES_CUSTOM_KEY');
    if (saved) setCustomKey(saved);
    fetchPublishedStories();
  }, []);

  const saveCustomKeyLocally = () => {
    localStorage.setItem('GEMINI_STORIES_CUSTOM_KEY', customKey.trim());
    setKeySavedToast(true);
    setTimeout(() => setKeySavedToast(false), 3000);
  };

  const fetchPublishedStories = async () => {
    setIsLoadingStories(true);
    try {
      const res = await fetch('/api/admin/destination-stories');
      const data = await res.json();
      if (data.success && Array.isArray(data.stories)) {
        setPublishedStories(data.stories);
      }
    } catch (err) {
      console.error('Failed fetching destination stories:', err);
    } finally {
      setIsLoadingStories(false);
    }
  };

  const handleGenerateStories = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationSuccess(null);

    try {
      const res = await fetch('/api/ai/generate-destination-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packagesCount,
          storiesCount,
          seoKeywords,
          stateFilter,
          customApiKey: customKey.trim() || undefined
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate destination stories');
      }

      setGeneratedStories(data.stories || []);
      setGenerationSuccess(`Successfully generated ${data.stories?.length || 0} stories using model: ${data.usedModel}`);
    } catch (err: any) {
      console.error('Generation error:', err);
      let errMsg = err.message || 'An unexpected error occurred during generation';
      if (errMsg.includes('503') || errMsg.includes('high demand')) {
        errMsg = 'Google AI is currently experiencing temporary high demand (503 Service Unavailable). Our backend automatically retried across multiple models. Please click "Generate AI Destination Stories" again in a few seconds.';
      }
      setGenerationError(errMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSingleStory = async (storyToSave: DestinationStory) => {
    setSavingStoryId(storyToSave.id);
    try {
      const res = await fetch('/api/admin/destination-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storyToSave)
      });
      const data = await res.json();
      if (data.success) {
        await fetchPublishedStories();
        setEditingStory(null);
      } else {
        alert('Error saving story: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error saving story: ' + err.message);
    } finally {
      setSavingStoryId(null);
    }
  };

  const handlePublishAllGenerated = async () => {
    if (generatedStories.length === 0) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/destination-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stories: generatedStories })
      });
      const data = await res.json();
      if (data.success) {
        setGenerationSuccess(`Published all ${generatedStories.length} stories live to landing page!`);
        setGeneratedStories([]);
        await fetchPublishedStories();
      } else {
        setGenerationError('Failed to publish stories: ' + data.error);
      }
    } catch (err: any) {
      setGenerationError('Error publishing stories: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTogglePublish = async (story: DestinationStory) => {
    const updated = { ...story, published: !story.published };
    await handleSaveSingleStory(updated);
  };

  const handleDeleteStory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this destination story?')) return;
    try {
      const res = await fetch(`/api/admin/destination-stories?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setPublishedStories((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error('Failed deleting story:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> AI Content Engine
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Key Separated (Safe for Production)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Landing Page Destination Stories AI
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl font-medium">
              Automatically analyze all active packages, pull places and prices, and generate high-converting SEO Destination Stories with Gemini AI.
            </p>
          </div>

          <Button
            onClick={() => setShowKeySettings(!showKeySettings)}
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold backdrop-blur-md self-start md:self-auto"
          >
            <Key className="w-4 h-4 mr-2 text-indigo-300" />
            {showKeySettings ? 'Hide Key Settings' : 'Dedicated Gemini API Key'}
            {showKeySettings ? <ChevronUp className="w-4 h-4 ml-1.5" /> : <ChevronDown className="w-4 h-4 ml-1.5" />}
          </Button>
        </div>

        {/* Collapsible Dedicated Key Settings */}
        {showKeySettings && (
          <div className="mt-6 pt-6 border-t border-white/10 bg-slate-900/60 p-5 rounded-2xl border border-indigo-500/20">
            <h3 className="text-sm font-bold text-indigo-200 flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-indigo-400" /> Dedicated Gemini Key for Destination Stories
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              You can provide a separate Gemini API Key below. This key is used strictly for generating destination stories and will <strong>never touch or interfere with your Blog Gemini key</strong>.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="password"
                placeholder="AQ.Ab8RN6LUrPAgJ3rDlTJt9IxuDtl1GT3y..."
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white font-mono text-xs focus-visible:ring-indigo-500"
              />
              <Button
                onClick={saveCustomKeyLocally}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold whitespace-nowrap"
              >
                {keySavedToast ? <Check className="w-4 h-4 mr-1 text-emerald-300" /> : <Save className="w-4 h-4 mr-1" />}
                {keySavedToast ? 'Key Saved!' : 'Save Key'}
              </Button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              Status: {customKey ? 'Custom override key loaded' : 'Using environment default (GEMINI_STORIES_API_KEY)'}
            </p>
          </div>
        )}
      </div>

      {/* Main Generator Card */}
      <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-5 px-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                Configure Story Generator
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Set preferences, sample size, and target keywords to generate landing page stories.
              </CardDescription>
            </div>
            {packages && packages.length > 0 && (
              <span className="bg-indigo-50 text-indigo-700 font-extrabold text-xs px-3 py-1 rounded-full border border-indigo-200">
                📦 {packages.length} Live Packages Available
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Number of Packages to Sample */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Packages to Analyze
              </Label>
              <select
                value={packagesCount}
                onChange={(e) => setPackagesCount(Number(e.target.value))}
                className="w-full h-10 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
              >
                <option value={5}>5 Live Packages</option>
                <option value={10}>10 Live Packages</option>
                <option value={15}>15 Live Packages</option>
                <option value={25}>25 Live Packages</option>
                <option value={50}>50 Live Packages (All active)</option>
              </select>
            </div>

            {/* Number of Stories to Generate */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Stories to Generate
              </Label>
              <select
                value={storiesCount}
                onChange={(e) => setStoriesCount(Number(e.target.value))}
                className="w-full h-10 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
              >
                <option value={1}>1 Destination Story</option>
                <option value={2}>2 Destination Stories</option>
                <option value={3}>3 Destination Stories</option>
                <option value={5}>5 Destination Stories</option>
                <option value={8}>8 Destination Stories</option>
              </select>
            </div>

            {/* Optional State Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Target State/Region (Optional)
              </Label>
              <Input
                placeholder="e.g. Kashmir, Kerala, Himachal"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="h-10 text-sm bg-slate-50 border-slate-300 rounded-xl"
              />
            </div>

            {/* SEO Keywords Input */}
            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Target SEO Focus Keywords
              </Label>
              <Input
                placeholder="e.g. romantic honeymoons, budget monsoon trips"
                value={seoKeywords}
                onChange={(e) => setSeoKeywords(e.target.value)}
                className="h-10 text-sm bg-slate-50 border-slate-300 rounded-xl"
              />
            </div>
          </div>

          {/* Alert / Notifications */}
          {generationError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{generationError}</span>
            </div>
          )}

          {generationSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{generationSuccess}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              ✨ Gemini AI will read package titles, places, itineraries, and costs to write high-ranking SEO stories.
            </p>
            <Button
              onClick={handleGenerateStories}
              disabled={isGenerating}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-sm h-11 px-8 rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Stories with Gemini AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate AI Destination Stories
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Stories Review & Publish Section */}
      {generatedStories.length > 0 && (
        <Card className="border-indigo-200 bg-indigo-50/30 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-950 to-slate-900 text-white py-5 px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  Newly Generated AI Stories ({generatedStories.length})
                </CardTitle>
                <CardDescription className="text-xs text-indigo-200 mt-0.5">
                  Review and edit before publishing to your landing page.
                </CardDescription>
              </div>

              <Button
                onClick={handlePublishAllGenerated}
                disabled={isGenerating}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Publish All Stories to Landing Page
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {generatedStories.map((story, idx) => (
                <div
                  key={story.id || idx}
                  className="bg-white border border-indigo-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Cover image preview */}
                    <div className="lg:col-span-4 aspect-[16/10] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative group">
                      {story.coverImage ? (
                        <img src={story.coverImage} alt={story.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Compass className="w-10 h-10" />
                        </div>
                      )}
                      <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-black px-2.5 py-1 rounded-sm">
                        {story.packageCount} Packages
                      </span>
                    </div>

                    {/* Story details */}
                    <div className="lg:col-span-8 space-y-3">
                      <h3 className="text-xl font-black text-slate-900">{story.title}</h3>
                      <div className="text-xs text-slate-600 leading-relaxed font-medium space-y-2">
                        {(story.narrative || '')
                          .split('\n\n')
                          .map((para: string, pIdx: number) => (
                            <p key={pIdx}>{para}</p>
                          ))}
                      </div>

                      {/* Individual Publish / Edit / Delete actions */}
                      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
                        <Button
                          onClick={() => handleSaveSingleStory(story)}
                          disabled={savingStoryId === story.id}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-4 shadow-sm"
                        >
                          {savingStoryId === story.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                          Save &amp; Publish This Story
                        </Button>
                        <Button
                          onClick={() => setEditingStory(story)}
                          variant="outline"
                          className="text-xs font-bold h-8 border-slate-300"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          onClick={() => setGeneratedStories((prev) => prev.filter((s) => s.id !== story.id))}
                          variant="outline"
                          className="text-xs font-bold h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Published Stories Manager */}
      <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-5 px-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-600" />
                Live Published Destination Stories ({publishedStories.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                These stories are currently active or scheduled for display on your Landing Page.
              </CardDescription>
            </div>

            <Button
              onClick={fetchPublishedStories}
              variant="outline"
              size="sm"
              className="text-xs font-bold border-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingStories ? 'animate-spin' : ''}`} />
              Refresh List
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {isLoadingStories ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-semibold">Loading published destination stories...</p>
            </div>
          ) : publishedStories.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl p-8 bg-slate-50/50">
              <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No Custom AI Stories Published Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                The landing page is currently displaying auto-derived state stories. Click the button above to generate customized SEO AI Destination Stories!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {publishedStories.map((story) => (
                <div
                  key={story.id}
                  className={`border rounded-2xl p-6 transition-all bg-white ${
                    story.published ? 'border-emerald-200 shadow-sm' : 'border-slate-200 opacity-60 bg-slate-50'
                  }`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Cover */}
                    <div className="lg:col-span-4 aspect-[16/10] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative">
                      {story.coverImage ? (
                        <img src={story.coverImage} alt={story.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Compass className="w-10 h-10" />
                        </div>
                      )}
                      <span
                        className={`absolute top-3 left-3 text-white text-[11px] font-black px-2.5 py-1 rounded-sm shadow-sm ${
                          story.published ? 'bg-emerald-600' : 'bg-slate-600'
                        }`}
                      >
                        {story.published ? 'Live on Landing Page' : 'Draft / Hidden'}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="lg:col-span-8 space-y-3">
                      <h3 className="text-xl font-black text-slate-900">{story.title}</h3>
                      <div className="text-xs text-slate-600 leading-relaxed font-medium space-y-2">
                        {(story.narrative || '')
                          .split('\n\n')
                          .map((para: string, pIdx: number) => (
                            <p key={pIdx}>{para}</p>
                          ))}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
                        <Button
                          onClick={() => handleTogglePublish(story)}
                          variant="outline"
                          className={`text-xs font-extrabold h-8 px-4 ${
                            story.published
                              ? 'border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100'
                              : 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          {story.published ? (
                            <>
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Unpublish
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Publish Live
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={() => setEditingStory(story)}
                          variant="outline"
                          className="text-xs font-bold h-8 border-slate-300"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit Details
                        </Button>

                        <Button
                          onClick={() => handleDeleteStory(story.id)}
                          variant="outline"
                          className="text-xs font-bold h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Story Modal */}
      {editingStory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" /> Edit Destination Story
              </h3>
              <button
                onClick={() => setEditingStory(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 text-xs">
              <div>
                <Label className="font-bold text-slate-700 mb-1 block">Destination / State Name</Label>
                <Input
                  value={editingStory.stateName}
                  onChange={(e) => setEditingStory({ ...editingStory, stateName: e.target.value })}
                  className="h-10 text-xs font-bold"
                />
              </div>

              <div>
                <Label className="font-bold text-slate-700 mb-1 block">SEO Headline (Title)</Label>
                <Input
                  value={editingStory.title}
                  onChange={(e) => setEditingStory({ ...editingStory, title: e.target.value })}
                  className="h-10 text-xs font-bold"
                />
              </div>

              <div>
                <Label className="font-bold text-slate-700 mb-1 block">Full Travel Story Narrative (Multi-Paragraph)</Label>
                <textarea
                  rows={8}
                  value={editingStory.narrative}
                  onChange={(e) => setEditingStory({ ...editingStory, narrative: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Write full 2-3 paragraph travel story here..."
                />
                <p className="text-[11px] text-slate-400 mt-1">Tip: Separate paragraphs using blank line breaks (Enter key twice).</p>
              </div>

              <div>
                <Label className="font-bold text-slate-700 mb-1 block">Cover Image URL</Label>
                <Input
                  value={editingStory.coverImage || ''}
                  onChange={(e) => setEditingStory({ ...editingStory, coverImage: e.target.value })}
                  className="h-10 text-xs font-mono"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 sticky bottom-0 bg-white z-10">
              <Button
                variant="outline"
                onClick={() => setEditingStory(null)}
                className="text-xs font-bold h-9"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSaveSingleStory(editingStory)}
                disabled={savingStoryId === editingStory.id}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-9 px-5 shadow-md"
              >
                {savingStoryId === editingStory.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
