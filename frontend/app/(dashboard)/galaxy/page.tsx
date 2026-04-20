// frontend/app/(dashboard)/galaxy/page.tsx

'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { MasteryBadge } from '../../components/MasteryBadge';
import { ZoomIn, ZoomOut, X, Loader2 } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import { useMastery } from '../../hooks/useMastery';
import { supabase } from '@/lib/supabase';

interface Topic {
  id: string;
  name: string;
  course: string;
  course_id: string;
  mastery: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface Course {
  id: string;
  name: string;
  code: string;
  mastery_percent: number;
}

interface Gap {
  id: string;
  topic: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  gap_score: number;
  course_id: string;
}

export default function GalaxyPage() {
  const router = useRouter();
  const { mastery: overallMastery } = useMastery();
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const graphRef = useRef<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          router.push('/login');
          return;
        }

        // Fetch courses and gaps in parallel
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

        if (coursesRes.ok) {
          coursesData = await coursesRes.json();
          setCourses(coursesData);
        }

        if (gapsRes.ok) {
          gapsData = await gapsRes.json();
          setGaps(gapsData);
        }

        // Transform gaps into topics
        const topicsData: Topic[] = gapsData.map((gap) => {
          const course = coursesData.find(c => c.id === gap.course_id);
          return {
            id: gap.id,
            name: gap.topic,
            course: course?.name || gap.course_id,
            course_id: gap.course_id,
            mastery: gap.gap_score || 0,
            priority: gap.priority,
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
      val: 20,
      color: topic.mastery >= 70 ? '#10B981' : topic.mastery >= 40 ? '#F59E0B' : '#EF4444',
    })),
    links: topics.slice(0, -1).map((topic, index) => ({
      source: topic.id,
      target: topics[index + 1]?.id || topics[0].id,
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
    if (m >= 70) return 'bg-mastered/20 text-mastered border-mastered/30';
    if (m >= 40) return 'bg-partial/20 text-partial border-partial/30';
    return 'bg-missing/20 text-missing border-missing/30';
  };

  const getStatusText = (m: number) => {
    if (m >= 70) return 'Mastered';
    if (m >= 40) return 'Partial';
    return 'Gap';
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage="galaxy" onNavigate={(page) => router.push(`/${page}`)} />
      <TopNav masteryPercentage={overallMastery} />
      <div className="ml-60 mt-16 p-8">
        <div className="max-w-full">
          <h2 className="text-3xl mb-8">Knowledge Galaxy</h2>
          <Tabs defaultValue="galaxy" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="galaxy">Galaxy View</TabsTrigger>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="report">Gap Report</TabsTrigger>
            </TabsList>

            <TabsContent value="galaxy">
              <GlassCard className="relative">
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  <Button onClick={() => graphRef.current?.zoom(2, 400)} size="sm" variant="outline" className="bg-card/80 backdrop-blur">
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => graphRef.current?.zoom(0.5, 400)} size="sm" variant="outline" className="bg-card/80 backdrop-blur">
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                </div>
                <div className="h-[700px] bg-background/50 rounded-lg">
                  {topics.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-muted-foreground">
                        <p className="mb-4">No topics found.</p>
                        <Button onClick={() => router.push('/upload')} className="bg-primary hover:bg-primary/90">
                          Upload Course Materials
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <ForceGraph2D
                      ref={graphRef}
                      graphData={graphData}
                      nodeLabel="name"
                      nodeColor="color"
                      linkColor={() => '#1E2235'}
                      backgroundColor="#0D0F1A"
                      onNodeClick={handleNodeClick}
                      nodeCanvasObject={(node, ctx, globalScale) => {
                        const label = node.name as string;
                        const fontSize = 12 / globalScale;
                        ctx.font = `${fontSize}px Inter`;
                        const textWidth = ctx.measureText(label).width;
                        const bckgDimensions = [textWidth, fontSize].map((n) => n + fontSize * 0.4);
                        ctx.fillStyle = node.color as string;
                        ctx.beginPath();
                        ctx.arc(node.x!, node.y!, 8, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.fillStyle = 'rgba(20, 22, 37, 0.8)';
                        ctx.fillRect(node.x! - bckgDimensions[0] / 2, node.y! + 10, bckgDimensions[0], bckgDimensions[1]);
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = '#F1F5F9';
                        ctx.fillText(label, node.x!, node.y! + 10 + bckgDimensions[1] / 2);
                      }}
                    />
                  )}
                </div>
              </GlassCard>
              {selectedTopic && (
                <div className="fixed right-8 top-24 w-80 z-20">
                  <GlassCard>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">{selectedTopic.name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedTopic.course}</p>
                      </div>
                      <button onClick={() => setSelectedTopic(null)} className="p-1 hover:bg-accent rounded">
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
                        className="w-full bg-primary hover:bg-primary/90"
                      >
                        Study This Topic
                      </Button>
                    </div>
                  </GlassCard>
                </div>
              )}
            </TabsContent>

            <TabsContent value="list">
              <GlassCard>
                <div className="flex gap-4 mb-6">
                  <Input
                    placeholder="Search topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 h-12 bg-input-background"
                  />
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-48 h-12 bg-input-background">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Topics</SelectItem>
                      <SelectItem value="mastered">Mastered</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="gap">Gaps</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {topics.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No topics found. Upload course materials to generate topics.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-border">
                        <tr>
                          <th className="text-left py-3 px-4">Topic</th>
                          <th className="text-left py-3 px-4">Course</th>
                          <th className="text-left py-3 px-4">Status</th>
                          <th className="text-left py-3 px-4">Mastery</th>
                          <th className="text-left py-3 px-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTopics.map((topic) => (
                          <tr key={topic.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                            <td className="py-4 px-4 font-medium">{topic.name}</td>
                            <td className="py-4 px-4 text-muted-foreground">{topic.course}</td>
                            <td className="py-4 px-4">
                              <Badge className={getStatusColor(topic.mastery)}>{getStatusText(topic.mastery)}</Badge>
                            </td>
                            <td className="py-4 px-4"><MasteryBadge percentage={topic.mastery} /></td>
                            <td className="py-4 px-4">
                              <Button 
                                onClick={() => handleStudy(topic)} 
                                size="sm" 
                                variant="outline" 
                                className="border-primary/50 text-primary"
                              >
                                Study
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            </TabsContent>

            <TabsContent value="report">
              <GlassCard>
                <h3 className="text-xl mb-6">Knowledge Gap Summary</h3>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-mastered/10 border border-mastered/30">
                    <p className="text-3xl font-bold text-mastered">{masteredCount}</p>
                    <p className="text-sm text-muted-foreground">Mastered Topics</p>
                  </div>
                  <div className="p-4 rounded-lg bg-partial/10 border border-partial/30">
                    <p className="text-3xl font-bold text-partial">{partialCount}</p>
                    <p className="text-sm text-muted-foreground">Partial Understanding</p>
                  </div>
                  <div className="p-4 rounded-lg bg-missing/10 border border-missing/30">
                    <p className="text-3xl font-bold text-missing">{gapCount}</p>
                    <p className="text-sm text-muted-foreground">Knowledge Gaps</p>
                  </div>
                </div>
                <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <p className="font-medium mb-2">Recommendation</p>
                  <p className="text-sm text-muted-foreground">
                    {gapCount > 0 
                      ? `You have ${gapCount} knowledge gaps that need attention. Focus on high-priority topics first.`
                      : partialCount > 0
                      ? `Great progress! Review the ${partialCount} partially mastered topics to reach full mastery.`
                      : "Excellent work! All topics are mastered. Keep maintaining your knowledge with regular practice."}
                  </p>
                </div>
              </GlassCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}