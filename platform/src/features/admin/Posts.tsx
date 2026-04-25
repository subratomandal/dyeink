import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { OctagonX, SquarePen } from 'lucide-react'
import { postService } from '@/services/postService'
import { useAdminStore } from '@/stores/adminStore'
import { useToast } from '@/components/common/feedback/Toast'
import PostsSkeleton from '@/components/admin/skeletons/PostsSkeleton'
import { Button } from '@/components/ui/button'
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
                <section className="animate-fade-in overflow-hidden rounded-2xl bg-transparent">
                    <div className="hidden grid-cols-[minmax(0,1fr)_130px_150px_92px] items-center gap-4 border-b border-border bg-transparent px-5 py-3 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:grid">
                        <div>Post</div>
                        <div>Status</div>
                        <div>Date</div>
                        <div className="text-right">Actions</div>
                    </div>

                    <div className="divide-y divide-border">
                        {filteredPosts.map((post, index) => (
                            <article
                                key={post.id}
                                className="grid gap-4 px-4 py-4 transition-colors hover:bg-muted/10 md:grid-cols-[minmax(0,1fr)_130px_150px_92px] md:items-center md:px-5"
                            >
                                <div className="min-w-0">
                                    <div className="mb-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                        #{String(index + 1).padStart(2, '0')}
                                    </div>
                                    <Link
                                        to={`/admin/posts/${post.id}/edit`}
                                        className="block truncate font-heading text-lg font-medium leading-tight tracking-tight text-foreground underline-offset-4 hover:underline"
                                        title={post.title}
                                    >
                                        {post.title}
                                    </Link>
                                </div>

                                <div className="flex items-center justify-between gap-3 md:justify-start">
                                    <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground md:hidden">
                                        Status
                                    </span>
                                    <span className="whitespace-nowrap text-sm text-emerald-500">Published</span>
                                </div>

                                <div className="flex items-center justify-between gap-3 md:justify-start">
                                    <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground md:hidden">
                                        Date
                                    </span>
                                    <time
                                        dateTime={post.createdAt}
                                        className="whitespace-nowrap font-mono text-xs text-muted-foreground"
                                    >
                                        {formatDateShort(post.createdAt)}
                                    </time>
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button asChild size="icon" variant="ghost" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                                        <Link to={`/admin/posts/${post.id}/edit`} aria-label={`Edit ${post.title}`}>
                                            <SquarePen className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-500"
                                        onClick={() => setPostToDelete(post.id)}
                                        aria-label={`Delete ${post.title}`}
                                    >
                                        <OctagonX className="h-4 w-4" />
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
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
