import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePosts, useUserUpvotes, useToggleUpvote, useUserGroup, useCommunityRealtime } from "@/hooks/useCommunity";
import PostCard from "@/components/community/PostCard";
import CreatePostDialog from "@/components/community/CreatePostDialog";
import GroupInfo from "@/components/community/GroupInfo";
import TrendingPosts from "@/components/community/TrendingPosts";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { PostSkeleton } from "@/components/community/PostSkeleton";
import { Loader2, Search, MessageCircle, GraduationCap, ArrowUpDown, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StudyGroupsList } from "@/components/community/groups/StudyGroupsList";
import type { CommunityPost } from "@/hooks/useCommunity";

const categories = ["all", "question", "tip", "discussion", "achievement"] as const;
type Category = (typeof categories)[number];
type SortOption = "newest" | "most_upvoted" | "most_commented";

const sortLabels: Record<SortOption, string> = {
  newest: "Newest",
  most_upvoted: "Most Upvoted",
  most_commented: "Most Commented",
};

const categoryChipColors: Record<string, string> = {
  all: "bg-primary/10 text-primary border-primary/20",
  question: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  tip: "bg-green-500/10 text-green-500 border-green-500/20",
  discussion: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  achievement: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
};

const Community = () => {
  useCommunityRealtime(); // Enable live syncing
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const groupIdParam = searchParams.get("groupId");

  const [activeTab, setActiveTab] = useState<string>(
    tabParam === "study-groups" ? "study-groups" : "all"
  );
  
  const { data: allPosts, isLoading: loadingAll, refetch: refetchAll } = usePosts();
  const { data: userGroup } = useUserGroup();
  const { data: groupPosts, isLoading: loadingGroup, refetch: refetchGroup } = usePosts(userGroup?.id);
  const { data: upvotedIds } = useUserUpvotes();
  const toggleUpvote = useToggleUpvote();

  const [category, setCategory] = useState<Category>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");

  const filterAndSort = useMemo(() => {
    return (posts: CommunityPost[] | undefined) => {
      if (!posts) return [];
      let filtered = posts;

      // Category filter
      if (category !== "all") {
        filtered = filtered.filter((p) => p.category === category);
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.content.toLowerCase().includes(q) ||
            p.profiles?.full_name?.toLowerCase().includes(q)
        );
      }

      // Sort
      if (sort === "most_upvoted") {
        filtered = [...filtered].sort((a, b) => b.upvote_count - a.upvote_count);
      } else if (sort === "most_commented") {
        filtered = [...filtered].sort((a, b) => b.comment_count - a.comment_count);
      }
      // "newest" is default from API

      return filtered;
    };
  }, [category, sort, search]);

  const renderPosts = (posts: typeof allPosts, loading: boolean) => {
    if (loading) {
      return (
        <div className="space-y-4 animate-fade-in">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      );
    }

    const filtered = filterAndSort(posts);

    if (!posts?.length) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No posts yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Be the first to share a question, tip, or achievement with the community!
          </p>
        </div>
      );
    }

    if (!filtered.length) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No posts match your filters. Try a different search or category.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filtered.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            isUpvoted={upvotedIds?.includes(post.id) ?? false}
            onToggleUpvote={() =>
              toggleUpvote.mutate({
                postId: post.id,
                isUpvoted: upvotedIds?.includes(post.id) ?? false,
              })
            }
          />
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Community</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Connect with fellow students, form peer study groups, and share resources.
            </p>
          </div>
          {activeTab !== "study-groups" && <CreatePostDialog />}
        </motion.div>

        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val);
            if (val === "study-groups") {
              setSearchParams({ tab: "study-groups" });
            } else {
              setSearchParams({});
            }
          }}
          className="w-full space-y-6"
        >
          <TabsList className="w-full bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="all" className="flex-1 text-xs sm:text-sm font-semibold">
              All Posts
            </TabsTrigger>
            <TabsTrigger value="group" className="flex-1 text-xs sm:text-sm font-semibold">
              University Cohort
            </TabsTrigger>
            <TabsTrigger value="study-groups" className="flex-1 text-xs sm:text-sm font-semibold gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Study Groups
            </TabsTrigger>
          </TabsList>

          {/* Posts Tabs (All & University Cohort) */}
          <TabsContent value="all" className="space-y-6 focus-visible:outline-none">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter Chips + Sort */}
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize whitespace-nowrap transition-colors ${
                      category === cat
                        ? categoryChipColors[cat]
                        : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                    }`}
                  >
                    {cat === "all" ? "All" : cat}
                  </button>
                ))}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{sortLabels[sort]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(Object.keys(sortLabels) as SortOption[]).map((opt) => (
                    <DropdownMenuItem key={opt} onClick={() => setSort(opt)}>
                      {sortLabels[opt]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
              <PullToRefresh onRefresh={async () => { await refetchAll(); }}>
                {renderPosts(allPosts, loadingAll)}
              </PullToRefresh>

              <div className="hidden lg:block space-y-4">
                <GroupInfo />
                <TrendingPosts posts={allPosts} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="group" className="space-y-6 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
              <PullToRefresh onRefresh={async () => { await refetchGroup(); }}>
                {userGroup ? (
                  renderPosts(groupPosts, loadingGroup)
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <GraduationCap className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">University Cohort</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Set your university and course in{" "}
                      <a href="/settings" className="text-primary underline">Settings</a>{" "}
                      to connect with your university course cohort.
                    </p>
                  </div>
                )}
              </PullToRefresh>

              <div className="hidden lg:block space-y-4">
                <GroupInfo />
                <TrendingPosts posts={allPosts} />
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Peer Study Groups */}
          <TabsContent value="study-groups" className="space-y-6 focus-visible:outline-none">
            <StudyGroupsList initialOpenGroupId={groupIdParam} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Community;

