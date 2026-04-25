import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Edit2 } from 'lucide-react'
import { postService } from '@/services/postService'
import { useAdminStore } from '@/stores/adminStore'
import { useToast } from '@/components/common/feedback/Toast'
import PostsSkeleton from '@/components/admin/skeletons/PostsSkeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Spinner } from '@/components/ui/spinner'
import { formatDateShort } from '@/lib/date'

export default function Posts() {
    const { posts, postsLoading, deletePostFromCache, fetchPosts } = useAdminStore()
    const { addToast } = useToast()
    const [postToDelete, setPostToDelete] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        fetchPosts()
    }, [fetchPosts])

    const showLoader = postsLoading && !posts
    const safePosts = posts || []
    const filteredPosts = safePosts.filter((post) => post.published)

    const confirmDelete = async () => {
        if (!postToDelete) return
        setIsDeleting(true)
        try {
            await postService.deletePost(postToDelete)
            deletePostFromCache(postToDelete)
            addToast({ type: 'success', message: 'Post deleted successfully' })
            setPostToDelete(null)
        } catch (error) {
            console.error('Failed to delete post:', error)
            addToast({ type: 'error', message: 'Failed to delete post.' })
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="mx-auto max-w-5xl pb-16">
            <div className="mb-12">
                <h1 className="m-0 font-heading text-4xl font-semibold">Published Posts</h1>
                <p className="mt-2 text-lg text-muted-foreground">Manage your live content.</p>
            </div>

            {showLoader ? (
                <PostsSkeleton />
            ) : filteredPosts.length === 0 ? (
                <div className="animate-fade-in rounded-md border border-dashed border-border p-16 text-center text-muted-foreground">
                    No published posts yet.
                </div>
            ) : (
                <div className="animate-fade-in">
                    <div className="mb-3 hidden grid-cols-[minmax(0,1fr)_140px_150px_96px] items-center px-5 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground md:grid">
                        <span>Title</span>
                        <span>Status</span>
                        <span>Date</span>
                        <span className="text-right">Actions</span>
                    </div>

                    <div className="space-y-3">
                        {filteredPosts.map((post, index) => (
                            <article
                                key={post.id}
                                className="group grid gap-4 rounded-3xl border border-border/80 bg-card/75 p-4 shadow-[0_14px_50px_hsl(var(--foreground)/0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-card md:grid-cols-[minmax(0,1fr)_140px_150px_96px] md:items-center md:p-5"
                            >
                                <div className="min-w-0">
                                    <div className="mb-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                        #{String(index + 1).padStart(2, '0')}
                                    </div>
                                    <Link
                                        to={`/admin/posts/${post.id}/edit`}
                                        className="block max-w-full truncate font-heading text-xl font-semibold leading-tight tracking-tight text-foreground underline-offset-4 hover:underline"
                                        title={post.title}
                                    >
                                        {post.title}
                                    </Link>
                                </div>

                                <div className="flex items-center justify-between gap-3 md:block">
                                    <span className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted-foreground md:hidden">
                                        Status
                                    </span>
                                    <Badge variant={post.published ? 'success' : 'warning'} className="rounded-full px-3 py-1">
                                        {post.published ? 'Published' : 'Draft'}
                                    </Badge>
                                </div>

                                <div className="flex items-center justify-between gap-3 md:block">
                                    <span className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted-foreground md:hidden">
                                        Date
                                    </span>
                                    <time
                                        dateTime={post.createdAt}
                                        className="inline-flex rounded-full border border-border/80 bg-background/60 px-3 py-1 font-mono text-xs text-muted-foreground"
                                    >
                                        {formatDateShort(post.createdAt)}
                                    </time>
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button asChild size="icon" variant="secondary" className="h-9 w-9 rounded-full">
                                        <Link to={`/admin/posts/${post.id}/edit`} aria-label={`Edit ${post.title}`}>
                                            <Edit2 className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-9 w-9 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-500"
                                        onClick={() => setPostToDelete(post.id)}
                                        aria-label={`Delete ${post.title}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            )}

            <AlertDialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The post will be permanently removed from your blog.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                confirmDelete()
                            }}
                            disabled={isDeleting}
                            className="bg-red-500 text-white hover:bg-red-600"
                        >
                            {isDeleting && <Spinner size={16} />}
                            {isDeleting ? 'Deleting…' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
