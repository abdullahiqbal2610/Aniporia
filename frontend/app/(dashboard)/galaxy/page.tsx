// app/(dashboard)/galaxy/page.tsx (or pages/galaxy.tsx)
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';
import { supabase } from '@/lib/supabase';          // keep your existing supabase import
import { useMastery } from '../../hooks/useMastery';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { MasteryBadge } from '../../components/MasteryBadge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { ZoomIn, ZoomOut, X, Loader2, Sparkles, Orbit } from 'lucide-react';

// ---------- Type Definitions ----------
interface Topic {
  id: string;
  name: string;
  course: string;
  course_id: string;
  mastery: number;    // 0-100
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface Course {
  id: string;
  name: string;
}

interface Gap {
  id: string;
  topic: string;
  course_id: string;
  gap_score: number;
  priority: string;
}

export default function GalaxyPage() {
  const router = useRouter();
  const { mastery: overallMastery } = useMastery();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'mastered' | 'partial' | 'gap'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const graphRef = useRef<any>(null);

  // Fetch real data from Supabase (as in your original code)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          router.push('/login');
          return;
        }

        // Fetch courses and gaps in parallel from your backend
        const [coursesRes, gapsRes] = await Promise.all([
          fetch('http://localhost:8000/courses/', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('http://localhost:8000/gaps/', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        let coursesData: Course[] = [];
        let gapsData: Gap[] = [];

        if (coursesRes.ok) coursesData = await coursesRes.json();
        if (gapsRes.ok) gapsData = await gapsRes.json();

        setCourses(coursesData);

        // Transform gaps into topics
        const topicsData: Topic[] = gapsData.map((gap) => {
          const course = coursesData.find(c => c.id === gap.course_id);
          return {
            id: gap.id,
            name: gap.topic,
            course: course?.name || gap.course_id,
            course_id: gap.course_id,
            mastery: gap.gap_score || 0,
            priority: (gap.priority as Topic['priority']) || 'medium',
          };
        });
        setTopics(topicsData);
      } catch (error) {
        console.error('Error fetching galaxy data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Build graph data from real topics
  const graphData = {
    nodes: topics.map((topic) => ({
      id: topic.id,
      name: topic.name,
      val: 20 + (topic.mastery / 10),
      color: topic.mastery >= 70 ? '#10B981' : topic.mastery >= 40 ? '#F59E0B' : '#EF4444',
      mastery: topic.mastery,
    })),
    links: topics.slice(0, -1).map((_, idx) => ({
      source: topics[idx].id,
      target: topics[idx + 1].id,
    })),
  };

  const handleNodeClick = useCallback((node: any) => {
    const topic = topics.find((t) => t.id === node.id);
    if (topic) setSelectedTopic(topic);
  }, [topics]);

  const handleStudy = (topic: Topic) => {
    router.push(`/practice?topic=${encodeURIComponent(topic.name)}&score=${topic.mastery}`);
  };

  const getStatusColor = (m: number) => {
    if (m >= 70) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (m >= 40) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  };

  const getStatusText = (m: number) => {
    if (m >= 70) return 'Mastered';
    if (m >= 40) return 'Partial';
    return 'Gap';
  };

  // Filtering logic for list view
  const filteredTopics = topics.filter((topic) => {
    const matchesSearch = topic.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'mastered' && topic.mastery >= 70) ||
      (filterStatus === 'partial' && topic.mastery >= 40 && topic.mastery < 70) ||
      (filterStatus === 'gap' && topic.mastery < 40);
    return matchesSearch && matchesFilter;
  });

  const masteredCount = topics.filter(t => t.mastery >= 70).length;
  const partialCount = topics.filter(t => t.mastery >= 40 && t.mastery < 70).length;
  const gapCount = topics.filter(t => t.mastery < 40).length;
  const avgMastery = topics.length ? Math.round(topics.reduce((s, t) => s + t.mastery, 0) / topics.length) : 0;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95, filter: 'blur(8px)' },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: { type: 'spring', damping: 20, stiffness: 100 },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0F1A] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
          <Loader2 className="w-12 h-12 text-cyan-400" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0F1A] overflow-x-hidden">
      {/* Starfield + Nebula Background (with mouse parallax) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,#1a1f3a,transparent)] opacity-60" />
        <div className="starfield" />
        <div className="nebula-clouds" />
      </div>

      <Sidebar currentPage="galaxy" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={overallMastery} />

      <main className="ml-60 mt-16 p-6 md:p-8 relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-full"
        >
          {/* Animated Header with typewriter effect */}
          <motion.div variants={itemVariants} className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Knowledge Galaxy
            </h1>
            <p className="text-cyan-300/70 mt-2">Navigate your learning universe</p>
          </motion.div>

          <Tabs defaultValue="galaxy" className="w-full">
            <TabsList className="mb-6 bg-black/20 backdrop-blur-sm border border-white/10">
              <TabsTrigger value="galaxy">🌌 Galaxy View</TabsTrigger>
              <TabsTrigger value="list">📋 List View</TabsTrigger>
              <TabsTrigger value="report">📊 Gap Report</TabsTrigger>
            </TabsList>

            {/* ---------- GALAXY VIEW (Force Graph) ---------- */}
            <TabsContent value="galaxy">
              <motion.div variants={cardVariants}>
                <GlassCard className="relative overflow-hidden">
                  <div className="absolute top-4 left-4 z-10 flex gap-2">
                    <Button
                      onClick={() => graphRef.current?.zoom(2, 400)}
                      size="sm"
                      variant="outline"
                      className="bg-black/50 backdrop-blur border-white/20"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => graphRef.current?.zoom(0.5, 400)}
                      size="sm"
                      variant="outline"
                      className="bg-black/50 backdrop-blur border-white/20"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="h-[650px] w-full rounded-lg bg-black/20">
                    {topics.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full gap-4">
                        <p className="text-gray-400">No topics found. Upload course materials.</p>
                        <Button onClick={() => router.push('/upload')} className="bg-cyan-600">
                          Upload Materials
                        </Button>
                      </div>
                    ) : (
                      <ForceGraph2D
                        ref={graphRef}
                        graphData={graphData}
                        nodeLabel="name"
                        nodeColor="color"
                        linkColor={() => '#3b82f6'}
                        linkWidth={1.5}
                        linkDirectionalParticles={2}
                        linkDirectionalParticleSpeed={0.005}
                        backgroundColor="#0D0F1A"
                        onNodeClick={handleNodeClick}
                        nodeCanvasObject={(node, ctx, globalScale) => {
                          const label = node.name as string;
                          const fontSize = 12 / globalScale;
                          ctx.font = `${fontSize}px Inter, sans-serif`;
                          const textWidth = ctx.measureText(label).width;
                          const padding = 6;
                          ctx.fillStyle = node.color as string;
                          ctx.beginPath();
                          ctx.arc(node.x!, node.y!, 7, 0, 2 * Math.PI);
                          ctx.fill();
                          ctx.fillStyle = 'rgba(0,0,0,0.7)';
                          ctx.fillRect(
                            node.x! - textWidth / 2 - padding / 2,
                            node.y! + 10,
                            textWidth + padding,
                            fontSize + 4
                          );
                          ctx.fillStyle = '#F1F5F9';
                          ctx.textAlign = 'center';
                          ctx.textBaseline = 'middle';
                          ctx.fillText(label, node.x!, node.y! + 10 + (fontSize + 4) / 2);
                        }}
                      />
                    )}
                  </div>
                </GlassCard>
              </motion.div>

              {/* Floating Topic Detail Sidebar */}
              <AnimatePresence>
                {selectedTopic && (
                  <motion.div
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25 }}
                    className="fixed right-6 top-24 w-80 z-20"
                  >
                    <GlassCard className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-semibold">{selectedTopic.name}</h3>
                          <p className="text-sm text-muted-foreground">{selectedTopic.course}</p>
                        </div>
                        <button onClick={() => setSelectedTopic(null)} className="p-1 hover:bg-white/10 rounded">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Mastery Level</p>
                          <MasteryBadge percentage={selectedTopic.mastery} />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Status</p>
                          <Badge className={getStatusColor(selectedTopic.mastery)}>
                            {getStatusText(selectedTopic.mastery)}
                          </Badge>
                        </div>
                        <Button
                          onClick={() => handleStudy(selectedTopic)}
                          className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:shadow-lg transition-all"
                        >
                          Study Topic
                        </Button>
                      </div>
                    </GlassCard>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* ---------- LIST VIEW with staggered rows ---------- */}
            <TabsContent value="list">
              <motion.div variants={cardVariants}>
                <GlassCard>
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <Input
                      placeholder="Search topics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-black/40 border-white/20"
                    />
                    <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                      <SelectTrigger className="w-48 bg-black/40 border-white/20">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Topics</SelectItem>
                        <SelectItem value="mastered">Mastered (≥70%)</SelectItem>
                        <SelectItem value="partial">Partial (40-69%)</SelectItem>
                        <SelectItem value="gap">Gaps (&lt;40%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {filteredTopics.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">No matching topics found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-white/10">
                          <tr>
                            <th className="text-left py-3 px-4">Topic</th>
                            <th className="text-left py-3 px-4">Course</th>
                            <th className="text-left py-3 px-4">Status</th>
                            <th className="text-left py-3 px-4">Mastery</th>
                            <th className="text-left py-3 px-4">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTopics.map((topic, idx) => (
                            <motion.tr
                              key={topic.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              className="border-b border-white/5 hover:bg-white/5 transition-colors"
                            >
                              <td className="py-4 px-4 font-medium">{topic.name}</td>
                              <td className="py-4 px-4 text-gray-300">{topic.course}</td>
                              <td className="py-4 px-4">
                                <Badge className={getStatusColor(topic.mastery)}>
                                  {getStatusText(topic.mastery)}
                                </Badge>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${topic.mastery}%` }}
                                      transition={{ duration: 1, delay: idx * 0.05 }}
                                      className="h-full rounded-full"
                                      style={{
                                        background: `linear-gradient(90deg, ${topic.mastery >= 70 ? '#10B981' : topic.mastery >= 40 ? '#F59E0B' : '#EF4444'}, #a855f7)`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs">{topic.mastery}%</span>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <Button
                                  onClick={() => handleStudy(topic)}
                                  size="sm"
                                  variant="outline"
                                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                                >
                                  Study
                                </Button>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            </TabsContent>

            {/* ---------- REPORT VIEW with animated progress & sparkles ---------- */}
            <TabsContent value="report">
              <motion.div variants={cardVariants}>
                <GlassCard>
                  <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    Knowledge Gap Analysis
                  </h3>
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                      { label: 'Mastered', count: masteredCount, color: 'emerald', icon: '🏆' },
                      { label: 'Partial', count: partialCount, color: 'amber', icon: '📘' },
                      { label: 'Gaps', count: gapCount, color: 'rose', icon: '⚠️' },
                    ].map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.1, type: 'spring' }}
                        className={`p-4 rounded-xl bg-${stat.color}-900/20 border border-${stat.color}-500/30 text-center`}
                      >
                        <div className="text-3xl mb-1">{stat.icon}</div>
                        <div className="text-3xl font-bold text-${stat.color}-400">{stat.count}</div>
                        <p className="text-sm text-gray-300">{stat.label}</p>
                      </motion.div>
                    ))}
                  </div>
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Overall Mastery</span>
                      <span className="font-mono">{avgMastery}%</span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${avgMastery}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full relative"
                      >
                        <div className="absolute right-0 top-0 h-full w-2 bg-white blur-sm animate-pulse" />
                      </motion.div>
                    </div>
                  </div>
                  <div className="p-5 rounded-xl bg-gradient-to-r from-cyan-900/30 to-purple-900/30 border border-cyan-500/30">
                    <p className="font-medium text-cyan-300 flex items-center gap-2">
                      <Orbit className="w-4 h-4" /> Recommendation
                    </p>
                    <p className="text-gray-200 text-sm mt-1">
                      {gapCount > 0
                        ? `You have ${gapCount} critical knowledge gaps. Focus on high-priority topics like ${
                            topics.find((t) => t.mastery < 40)?.name
                          } first.`
                        : partialCount > 0
                        ? `Great progress! Review the ${partialCount} partially mastered topics to reach full mastery.`
                        : 'Excellent work! All topics mastered. Keep practicing to maintain your galaxy.'}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      {/* CSS for starfield and nebula effects */}
      <style>{`
        .starfield {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: radial-gradient(2px 2px at 20px 30px, #fff, rgba(0,0,0,0)),
                            radial-gradient(1px 1px at 80px 200px, #ddd, rgba(0,0,0,0));
          background-size: 200px 200px, 150px 150px;
          background-repeat: repeat;
          opacity: 0.4;
          animation: starMove 60s linear infinite;
        }
        @keyframes starMove {
          from { background-position: 0 0; }
          to { background-position: 200px 200px; }
        }
        .nebula-clouds {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 70% 20%, rgba(100,0,200,0.2), transparent 60%),
                      radial-gradient(circle at 20% 80%, rgba(0,150,200,0.15), transparent 70%);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}