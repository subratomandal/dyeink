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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
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
                <div className="animate-fade-in overflow-x-auto rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs font-bold uppercase tracking-wider">Title</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-wider">Date</TableHead>
                                <TableHead className="w-12" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPosts.map((post) => (
                                <TableRow key={post.id}>
                                    <TableCell className="py-6 align-middle">
                                        <Link
                                            to={`/admin/posts/${post.id}/edit`}
                                            className="block max-w-xs truncate text-base font-bold text-foreground hover:underline"
                                            title={post.title}
                                        >
                                            {post.title}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="py-6 align-middle">
                                        <Badge variant={post.published ? 'success' : 'warning'}>
                                            {post.published ? 'Published' : 'Draft'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-6 align-middle text-sm text-muted-foreground">
                                        {formatDateShort(post.createdAt)}
                                    </TableCell>
                                    <TableCell className="py-6 text-right align-middle">
                                        <div className="flex justify-end gap-2">
                                            <Button asChild size="icon" variant="secondary" className="h-8 w-8 rounded-full">
                                                <Link to={`/admin/posts/${post.id}/edit`} aria-label="Edit">
                                                    <Edit2 className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-500"
                                                onClick={() => setPostToDelete(post.id)}
                                                aria-label="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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
