"use client";

import * as React from "react";
import { useInView } from "react-intersection-observer";
import { Loader2, MessageSquare, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Post {
  id: number;
  title: string;
  content: string;
  likes?: number;
  comments?: number;
}

export function Feed() {
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const { ref, inView } = useInView();

  const loadMorePosts = React.useCallback(async () => {
    if (loading) return;
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newPosts = Array.from({ length: 10 }, (_, i) => ({
      id: (page - 1) * 10 + i + 1,
      title: `Post ${(page - 1) * 10 + i + 1}`,
      content:
        "This is a sample post content with engaging information about the latest trends and updates.",
      likes: Math.floor(Math.random() * 1000),
      comments: Math.floor(Math.random() * 100),
    }));

    setPosts((prev) => [...prev, ...newPosts]);
    setPage((prev) => prev + 1);
    setLoading(false);
  }, [page, loading]);

  React.useEffect(() => {
    if (inView) {
      loadMorePosts();
    }
  }, [inView, loadMorePosts]);

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto p-4 gap-4 bg-black min-h-screen">
      {posts.map((post) => (
        <div
          key={post.id}
          className="w-full p-6 bg-black rounded-lg border border-gray-800 shadow-lg hover:border-gray-700 transition-all hover:shadow-primary/5"
        >
          <h2 className="text-xl font-bold tracking-tighter mb-3 bg-gradient-to-r from-primary to-purple-500 text-transparent bg-clip-text">
            {post.title}
          </h2>
          <p className="text-gray-400 mb-4">{post.content}</p>

          <div className="flex items-center gap-6 text-gray-400">
            <Button
              variant="ghost"
              size="sm"
              className="hover:text-primary hover:bg-gray-900 transition-colors"
            >
              <Heart className="h-4 w-4 mr-2" />
              {post.likes}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hover:text-primary hover:bg-gray-900 transition-colors"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {post.comments}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hover:text-primary hover:bg-gray-900 transition-colors"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      ))}

      <div ref={ref} className="w-full flex justify-center p-4">
        {loading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
      </div>
    </div>
  );
}
