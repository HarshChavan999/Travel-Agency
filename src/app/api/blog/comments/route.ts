import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/lib/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface CommentRecord {
  id: string;
  blogSlug: string;
  blogId?: string;
  name: string;
  email?: string;
  comment: string;
  createdAt: string;
  likes: number;
  approved?: boolean;
}

const COMMENTS_FILE_PATH = path.join(process.cwd(), 'data', 'blog_comments.json');

function sanitizeText(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

function readLocalComments(): CommentRecord[] {
  try {
    if (fs.existsSync(COMMENTS_FILE_PATH)) {
      const raw = fs.readFileSync(COMMENTS_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.error('Failed reading local blog_comments.json:', err);
  }
  return [];
}

function writeLocalComments(comments: CommentRecord[]): void {
  try {
    const dir = path.dirname(COMMENTS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(COMMENTS_FILE_PATH, JSON.stringify(comments, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed writing to blog_comments.json:', err);
  }
}

function sanitizeCommentForClient(c: CommentRecord) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { email, ...safeComment } = c;
  return safeComment;
}

// GET: Fetch comments for a blog post
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug')?.trim();
    const blogId = searchParams.get('blogId')?.trim();

    if (!slug && !blogId) {
      return NextResponse.json({ error: 'Slug or BlogId is required' }, { status: 400 });
    }

    const commentsMap = new Map<string, CommentRecord>();

    // 1. Read from local JSON cache first
    const localComments = readLocalComments();
    localComments.forEach((c) => {
      if (
        (slug && c.blogSlug === slug) ||
        (blogId && c.blogId === blogId)
      ) {
        if (c.approved !== false) {
          commentsMap.set(c.id, c);
        }
      }
    });

    // 2. Query Firestore collection
    try {
      initializeFirebase();
      const db = getFirestore();
      const collectionRef = db.collection('blog_comments');

      let querySnapshot: FirebaseFirestore.QuerySnapshot | null = null;
      if (slug) {
        querySnapshot = await collectionRef
          .where('blogSlug', '==', slug)
          .get();
      } else if (blogId) {
        querySnapshot = await collectionRef
          .where('blogId', '==', blogId)
          .get();
      }

      if (querySnapshot && !querySnapshot.empty) {
        querySnapshot.forEach((doc) => {
          const data = doc.data() as CommentRecord;
          const commentObj: CommentRecord = {
            id: doc.id,
            blogSlug: data.blogSlug || slug || '',
            blogId: data.blogId || blogId || '',
            name: data.name || 'Traveler',
            email: data.email || '',
            comment: data.comment || '',
            createdAt: data.createdAt || new Date().toISOString(),
            likes: typeof data.likes === 'number' ? data.likes : 0,
            approved: data.approved !== false,
          };
          if (commentObj.approved) {
            commentsMap.set(doc.id, commentObj);
          }
        });
      }
    } catch (fsError) {
      console.warn('Firestore fetch blog_comments error (using fallback):', fsError);
    }

    const commentsList = Array.from(commentsMap.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(sanitizeCommentForClient);

    return NextResponse.json({
      success: true,
      comments: commentsList,
      total: commentsList.length,
    });
  } catch (error: any) {
    console.error('Error fetching blog comments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Submit a new comment
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, comment, agreedToPolicy, blogSlug, blogId } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      return NextResponse.json({ error: 'Please enter a valid name (2 to 80 characters).' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length < 3 || comment.trim().length > 3000) {
      return NextResponse.json({ error: 'Comment must be between 3 and 3,000 characters.' }, { status: 400 });
    }

    if (!agreedToPolicy) {
      return NextResponse.json({ error: 'You must agree to the data collection policy.' }, { status: 400 });
    }

    if (!blogSlug || typeof blogSlug !== 'string') {
      return NextResponse.json({ error: 'Blog slug is required.' }, { status: 400 });
    }

    const commentId = 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const sanitizedName = sanitizeText(name);
    const sanitizedComment = sanitizeText(comment);
    const cleanEmail = email.trim().toLowerCase();
    const cleanSlug = blogSlug.trim();
    const cleanBlogId = (blogId || '').toString().trim();

    const newCommentRecord: CommentRecord = {
      id: commentId,
      blogSlug: cleanSlug,
      blogId: cleanBlogId,
      name: sanitizedName,
      email: cleanEmail,
      comment: sanitizedComment,
      createdAt: new Date().toISOString(),
      likes: 0,
      approved: true,
    };

    // 1. Save to local fallback cache
    try {
      const currentList = readLocalComments();
      currentList.push(newCommentRecord);
      writeLocalComments(currentList);
    } catch (err) {
      console.error('Failed saving to local comments json:', err);
    }

    // 2. Save to Firestore
    try {
      initializeFirebase();
      const db = getFirestore();
      await db.collection('blog_comments').doc(commentId).set(newCommentRecord);
    } catch (fsErr) {
      console.warn('Firestore blog_comments write failed, saved locally:', fsErr);
    }

    return NextResponse.json({
      success: true,
      comment: sanitizeCommentForClient(newCommentRecord),
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating blog comment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH: Like / react to a comment
export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { commentId, action } = body;

    if (!commentId || typeof commentId !== 'string') {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    const delta = action === 'unlike' ? -1 : 1;
    let updatedLikes = 0;

    // 1. Update local cache
    const currentList = readLocalComments();
    const targetIdx = currentList.findIndex((c) => c.id === commentId);
    if (targetIdx !== -1) {
      currentList[targetIdx].likes = Math.max(0, (currentList[targetIdx].likes || 0) + delta);
      updatedLikes = currentList[targetIdx].likes;
      writeLocalComments(currentList);
    }

    // 2. Update Firestore
    try {
      initializeFirebase();
      const db = getFirestore();
      const docRef = db.collection('blog_comments').doc(commentId);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        await docRef.update({
          likes: FieldValue.increment(delta),
        });
        const currentFsLikes = docSnap.data()?.likes || 0;
        updatedLikes = Math.max(0, currentFsLikes + delta);
      }
    } catch (fsErr) {
      console.warn('Firestore like update error:', fsErr);
    }

    return NextResponse.json({
      success: true,
      commentId,
      likes: updatedLikes,
    });
  } catch (error: any) {
    console.error('Error updating comment like:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
